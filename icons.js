'use strict';
// One stroke style for material types, navigation and reader controls.
window.CourseUI = (() => {
  const paths = {
    video: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3Z"/>',
    document: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    presentation: '<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M12 16v5m-4 0 4-3 4 3M7 11l3-3 3 3 4-5"/>',
    table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    back: '<path d="m10 5-7 7 7 7M3 12h18"/>',
    forward: '<path d="m14 5 7 7-7 7M3 12h18"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    notes: '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M8 16l1-5L18 2l4 4-9 9Z"/>',
    bookmark: '<path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16l-6-4Z"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    upload: '<path d="M12 15V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
    external: '<path d="M14 3h7v7M10 14 21 3M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name] || paths.document}</svg>`;
  function materialType(item) {
    if (item.kind === 'video') return {icon: 'video', label: 'Видео'};
    if (/^(pptx?|odp)$/i.test(item.format)) return {icon: 'presentation', label: 'Презентация'};
    if (/^(xlsx?|csv|ods)$/i.test(item.format)) return {icon: 'table', label: 'Таблица'};
    return {icon: 'document', label: 'Документ'};
  }
  function hydrate() {
    document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
  }
  hydrate();
  return {icon, materialType};
})();
