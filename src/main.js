import './styles/base.css';
import './styles/layout.css';
import './styles/form.css';
import './styles/components.css';

import { initMeetingMinutesForm } from './forms/meeting-minutes-form.js';
import { initIncidentResponseForm } from './forms/incident-response-form.js';
import { initProjectStatusForm } from './forms/project-status-form.js';

function initTabs() {
  const buttons = document.querySelectorAll('.tab-nav__btn');
  const panels = document.querySelectorAll('.tab-panel');

  function activateTab(tabId) {
    buttons.forEach((btn) => {
      btn.classList.toggle('tab-nav__btn--active', btn.dataset.tab === tabId);
    });
    panels.forEach((panel) => {
      panel.classList.toggle('tab-panel--active', panel.id === tabId);
    });
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      activateTab(tabId);
      history.replaceState(null, '', `#${tabId}`);
    });
  });

  // Activate tab from hash
  const hash = location.hash.slice(1);
  if (hash && document.getElementById(hash)) {
    activateTab(hash);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initMeetingMinutesForm();
  initIncidentResponseForm();
  initProjectStatusForm();
});
