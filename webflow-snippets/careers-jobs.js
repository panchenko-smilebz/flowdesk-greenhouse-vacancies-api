  /* ===== JOBS (Greenhouse) ===== */
  // Rollback to Workable: set API_URL to '/workable-vacancies-api/api/vacancies'.
  // normalizeJobs accepts both response formats.
  (() => {
    const API_URL = '/greenhouse-vacancies-api/api/vacancies';

    const SELECTORS = {
      filterDropdown: '[job-filter]',
      filterInner: '.filters_dropdown-inner',
      filterLabel: '.jobs-filter_label',
      dropdownLabel: '.dropdown_label',
      jobItem: '[fs-list-element="item"]',
      emptyState: '[fs-list-element="empty"]',
      paginationWrapper: '[fs-list-element="pagination-wrapper"]',
    };

    function unique(values) {
      return [...new Set(values.filter(Boolean))];
    }

    function createSafeId(value = '') {
      return String(value)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9À-ɏЀ-ӿ]+/gi, '-')
        .replace(/^-+|-+$/g, '');
    }

    async function fetchJobs() {
      const response = await fetch(API_URL, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data.jobs) ? data.jobs : [];
    }

    // Greenhouse proxy returns strings; Workable proxy returns location objects.
    function formatLocation(location) {
      if (!location) return '';
      if (typeof location === 'string') return location.trim();

      return [location.city, location.subregion, location.country_name].filter(Boolean).join(', ');
    }

    function normalizeJobs(rawJobs = []) {
      return rawJobs.map((job) => ({
        full_title: job.full_title || '',
        formattedLocations: unique((Array.isArray(job.locations) ? job.locations : []).map(formatLocation)),
        department: job.department || '',
        url: job.url || '',
      }));
    }

    function collectFilterValues(jobs) {
      return {
        jobs: unique(jobs.map((job) => job.full_title)).sort((a, b) => a.localeCompare(b)),
        location: unique(jobs.flatMap((job) => job.formattedLocations)).sort((a, b) => a.localeCompare(b)),
        department: unique(jobs.map((job) => job.department)).sort((a, b) => a.localeCompare(b)),
      };
    }

    function buildFilterOptions(filterName, values) {
      const filterElement = document.querySelector(`${SELECTORS.filterDropdown}[job-filter="${filterName}"]`);
      if (!filterElement) return;

      const inner = filterElement.querySelector(SELECTORS.filterInner);
      const templateLabel = filterElement.querySelector(SELECTORS.filterLabel);

      if (!inner || !templateLabel) return;

      inner.innerHTML = '';
      inner.setAttribute('fs-list-filtermatch', 'or');

      const fragment = document.createDocumentFragment();

      values.forEach((value, index) => {
        const label = templateLabel.cloneNode(true);
        const input = label.querySelector('input');
        const text = label.querySelector('span:last-child');

        if (!input || !text) return;

        const safeId = `job-filter-${filterName}-${createSafeId(value)}-${index}`;

        input.id = safeId;
        input.name = filterName;
        input.value = value;
        input.setAttribute('fs-list-value', value);
        input.setAttribute('fs-list-filtermatch', 'or');

        text.textContent = value;

        fragment.appendChild(label);
      });

      inner.appendChild(fragment);
    }

    function removeFormatFilter() {
      // Workplace type filter is no longer used (Greenhouse has no such field).
      // Safe to keep until the dropdown is deleted in the Designer.
      document.querySelectorAll(`${SELECTORS.filterDropdown}[job-filter="format"]`).forEach((el) => el.remove());
    }

    function renderFilters(jobs) {
      const filterValues = collectFilterValues(jobs);

      buildFilterOptions('jobs', filterValues.jobs);
      buildFilterOptions('location', filterValues.location);
      buildFilterOptions('department', filterValues.department);
    }

    function setupDropdownCounters() {
      const dropdowns = document.querySelectorAll(SELECTORS.filterDropdown);

      dropdowns.forEach((dropdown) => {
        const label = dropdown.querySelector(SELECTORS.dropdownLabel);
        if (!label) return;

        const baseText = label.textContent.trim();

        const updateCount = () => {
          const checkedCount = dropdown.querySelectorAll('input[type="checkbox"]:checked').length;

          label.textContent = checkedCount > 0 ? `${baseText} (${checkedCount})` : baseText;
        };

        dropdown.addEventListener('change', (event) => {
          const target = event.target;
          if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') {
            return;
          }

          updateCount();
        });

        updateCount();
      });
    }

    function createJobElement(template, job) {
      const item = template.cloneNode(true);

      const nameEl = item.querySelector('[job-data="name"]');
      const locationEl = item.querySelector('[job-data="location"]');
      const locationWrapper = locationEl ? locationEl.parentElement : null;
      const departmentEl = item.querySelector('[job-data="department"]');
      const linkEl = item.querySelector('[job-data="link"]');

      // Fields removed after the Greenhouse migration
      item.querySelectorAll('[job-data="format"], [job-data="keywords"]').forEach((el) => el.remove());

      if (nameEl) {
        nameEl.textContent = job.full_title;
      }

      if (departmentEl) {
        departmentEl.textContent = job.department;
      }

      if (linkEl) {
        linkEl.href = job.url || '#';
        linkEl.setAttribute('aria-label', `Open ${job.full_title}`);
      }

      if (locationEl && locationWrapper) {
        const locationTemplate = locationEl.cloneNode(true);
        locationWrapper.innerHTML = '';

        if (job.formattedLocations.length) {
          const locationFragment = document.createDocumentFragment();

          job.formattedLocations.forEach((locationValue) => {
            const locationItem = locationTemplate.cloneNode(true);
            locationItem.textContent = locationValue;
            locationFragment.appendChild(locationItem);
          });

          locationWrapper.appendChild(locationFragment);
        } else {
          const emptyLocationItem = locationTemplate.cloneNode(true);
          emptyLocationItem.textContent = '';
          locationWrapper.appendChild(emptyLocationItem);
        }
      }

      return item;
    }

    function toggleStaticUi(hasJobs) {
      const emptyState = document.querySelector(SELECTORS.emptyState);
      const paginationWrapper = document.querySelector(SELECTORS.paginationWrapper);

      if (emptyState) {
        emptyState.style.display = hasJobs ? 'none' : '';
      }

      if (paginationWrapper) {
        paginationWrapper.style.display = hasJobs ? '' : 'none';
      }
    }

    async function setupJobsList(listInstance) {
      const template = listInstance.listElement?.querySelector(SELECTORS.jobItem);
      if (!template) {
        throw new Error('Job item template not found');
      }

      removeFormatFilter();

      const rawJobs = await fetchJobs();
      const jobs = normalizeJobs(rawJobs);

      renderFilters(jobs);
      setupDropdownCounters();

      const newItems = jobs.map((job) => {
        const element = createJobElement(template, job);
        return listInstance.createItem(element);
      });

      template.remove();

      listInstance.items.value = newItems;
      listInstance.currentPage.value = 1;

      toggleStaticUi(newItems.length > 0);

      listInstance.triggerHook('filter');
    }

    window.FinsweetAttributes ||= [];
    window.FinsweetAttributes.push([
      'list',
      async (listInstances) => {
        const listInstance = listInstances?.[0];
        if (!listInstance) return;

        try {
          await setupJobsList(listInstance);
        } catch (error) {
          console.error('Jobs render error:', error);
          toggleStaticUi(false);
        }
      },
    ]);
  })();
  /* ===== END JOBS ===== */
