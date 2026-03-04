/**
 * Collects filled values from a rendered form preview.
 * Returns an object with static field values and dynamic row arrays.
 */
export function collectFormData(container) {
  const data = { fields: {}, dynamicSections: [] };

  // Collect static fields (data-key)
  container.querySelectorAll('[data-key]').forEach((el) => {
    const key = el.dataset.key;
    const value = el.value?.trim() || '';
    if (value) data.fields[key] = value;
  });

  // Collect dynamic row sections
  container.querySelectorAll('.dynamic-rows').forEach((section) => {
    const sectionKey = section.dataset.sectionKey || 'rows';
    const rows = [];
    section.querySelectorAll('.dynamic-row').forEach((row) => {
      const rowData = {};
      let hasValue = false;
      row.querySelectorAll('[data-field]').forEach((el) => {
        const val = el.value?.trim() || '';
        rowData[el.dataset.field] = val;
        if (val) hasValue = true;
      });
      if (hasValue) rows.push(rowData);
    });
    if (rows.length) {
      data.dynamicSections.push({ key: sectionKey, rows });
    }
  });

  return data;
}
