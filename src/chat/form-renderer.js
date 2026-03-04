/**
 * Renders a formDefinition JSON object into live HTML form elements
 * using existing CSS classes from form.css and components.css.
 */

const FIELD_TYPES = new Set([
  'text', 'date', 'datetime-local', 'email', 'number', 'select', 'textarea',
]);

function createFieldElement(field) {
  const group = document.createElement('div');
  group.className = 'form-group';
  if (field.flex) group.style.flex = field.flex;

  const label = document.createElement('label');
  label.className = 'form-label';
  label.textContent = field.label || field.key;
  group.appendChild(label);

  const type = FIELD_TYPES.has(field.type) ? field.type : 'text';

  let input;
  if (type === 'select') {
    input = document.createElement('select');
    input.className = 'form-select';
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = '—';
    input.appendChild(emptyOpt);
    for (const opt of (field.options || [])) {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      input.appendChild(option);
    }
  } else if (type === 'textarea') {
    input = document.createElement('textarea');
    input.className = 'form-textarea';
    input.rows = field.rows || 3;
  } else {
    input = document.createElement('input');
    input.className = 'form-input';
    input.type = type;
  }

  input.dataset.key = field.key;
  if (field.required) input.required = true;
  if (field.placeholder) input.placeholder = field.placeholder;
  if (field.maxLength) input.maxLength = field.maxLength;

  group.appendChild(input);
  return group;
}

function createDynamicRowSection(section, demoData) {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'fieldset';

  if (section.title) {
    const legend = document.createElement('legend');
    legend.className = 'fieldset__legend';
    legend.textContent = section.title;
    fieldset.appendChild(legend);
  }

  const container = document.createElement('div');
  container.className = 'dynamic-rows';
  container.dataset.sectionKey = section.title || 'dynamic';
  fieldset.appendChild(container);

  function createRow() {
    const row = document.createElement('div');
    row.className = 'dynamic-row';
    for (const rf of section.rowFields) {
      const fieldEl = createFieldElement(rf);
      // Use data-field for dynamic rows (matching existing pattern)
      const input = fieldEl.querySelector('input, select, textarea');
      if (input) {
        input.dataset.field = rf.key;
        delete input.dataset.key;
      }
      row.appendChild(fieldEl);
    }
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove';
    removeBtn.title = 'Remove';
    removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', () => row.remove());
    row.appendChild(removeBtn);
    return row;
  }

  // Populate with demo data rows, or one empty row
  const sectionKey = section.title || '';
  const demoRows = demoData?.dynamicRows?.[sectionKey];
  if (Array.isArray(demoRows) && demoRows.length > 0) {
    for (const rowData of demoRows) {
      const row = createRow();
      for (const [key, value] of Object.entries(rowData)) {
        const el = row.querySelector(`[data-field="${key}"]`);
        if (el) el.value = String(value);
      }
      container.appendChild(row);
    }
  } else {
    container.appendChild(createRow());
  }

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn-add';
  addBtn.textContent = section.addButtonLabel || '+ Add Row';
  addBtn.addEventListener('click', () => container.appendChild(createRow()));
  fieldset.appendChild(addBtn);

  return fieldset;
}

function createFieldsSection(section) {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'fieldset';

  if (section.title) {
    const legend = document.createElement('legend');
    legend.className = 'fieldset__legend';
    legend.textContent = section.title;
    fieldset.appendChild(legend);
  }

  const layout = Math.max(1, Math.min(section.layout || 1, 4));
  const fields = Array.isArray(section.fields) ? section.fields : [];
  if (layout > 1) {
    const row = document.createElement('div');
    row.className = `form-row form-row--${layout}`;
    for (const field of fields) {
      row.appendChild(createFieldElement(field));
    }
    fieldset.appendChild(row);
  } else {
    for (const field of fields) {
      fieldset.appendChild(createFieldElement(field));
    }
  }

  return fieldset;
}

/**
 * Render a formDefinition into a container element.
 * @param {HTMLElement} container - DOM element to render into
 * @param {object} def - formDefinition object
 */
export function renderForm(container, def) {
  container.innerHTML = '';

  const form = document.createElement('form');
  form.className = 'form-card';
  form.addEventListener('submit', (e) => e.preventDefault());

  if (def.title) {
    const title = document.createElement('h2');
    title.className = 'form-card__title';
    title.textContent = def.title;
    form.appendChild(title);
  }

  if (def.subtitle) {
    const subtitle = document.createElement('p');
    subtitle.style.cssText = 'color: var(--color-gray-500); font-size: var(--font-size-sm); margin-bottom: var(--spacing-4);';
    subtitle.textContent = def.subtitle;
    form.appendChild(subtitle);
  }

  for (const section of (def.sections || [])) {
    if (section.type === 'dynamicRows') {
      form.appendChild(createDynamicRowSection(section, def.demoData));
    } else {
      form.appendChild(createFieldsSection(section));
    }
  }

  container.appendChild(form);

  // Apply demo data to static fields
  if (def.demoData?.fields) {
    for (const [key, value] of Object.entries(def.demoData.fields)) {
      const el = form.querySelector(`[data-key="${key}"]`);
      if (el) el.value = String(value);
    }
  }
}
