/* Memo Cards page: tag filter + text search */
(function () {
  'use strict';

  var root = document.getElementById('memo-app');
  if (!root) { return; }

  var cardsEl = document.getElementById('memo-cards');
  var allBtn = document.getElementById('memo-filter-all');
  var searchInput = document.getElementById('memo-search');
  var viewLabel = document.getElementById('memo-view-label');
  var emptyMsg = document.getElementById('memo-empty');

  var cards = Array.prototype.slice.call(root.querySelectorAll('.memo-card'));
  var tagButtons = Array.prototype.slice.call(root.querySelectorAll('.memo-tag'));

  var cardTags = cards.map(function (card) {
    var raw = card.getAttribute('data-tags') || '';
    return raw === '' ? [] : raw.split('||');
  });
  var cardText = cards.map(function (card) {
    return (card.textContent || '').toLowerCase();
  });

  var displays = {};
  tagButtons.forEach(function (b) {
    var nameEl = b.querySelector('.memo-tag__name');
    displays[b.getAttribute('data-tag')] = nameEl ? nameEl.textContent : b.getAttribute('data-tag');
  });

  var currentTag = null;
  var query = '';

  function applyFilters() {
    var visible = 0;
    cards.forEach(function (card, i) {
      var tagOk = !currentTag || cardTags[i].indexOf(currentTag) !== -1;
      var queryOk = !query || cardText[i].indexOf(query) !== -1;
      var show = tagOk && queryOk;
      card.style.display = show ? '' : 'none';
      if (show) { visible += 1; }
    });
    tagButtons.forEach(function (b) {
      b.classList.toggle('is-active', (b.getAttribute('data-tag') || '') === (currentTag || ''));
    });
    if (allBtn) {
      allBtn.classList.toggle('is-active', !currentTag);
    }
    if (viewLabel) {
      viewLabel.textContent = currentTag ? '#' + (displays[currentTag] || currentTag) : 'All cards';
    }
    if (emptyMsg) {
      emptyMsg.hidden = visible !== 0;
    }
  }

  tagButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      var enc = b.getAttribute('data-tag');
      currentTag = (currentTag === enc) ? null : enc;
      applyFilters();
    });
  });

  if (allBtn) {
    allBtn.addEventListener('click', function () {
      currentTag = null;
      applyFilters();
    });
  }

  // Clicking a tag chip on a card filters by that tag
  if (cardsEl) {
    cardsEl.addEventListener('click', function (e) {
      var node = e.target;
      while (node && node !== cardsEl) {
        if (node.classList && node.classList.contains('memo-chip')) {
          var enc = node.getAttribute('data-tag');
          currentTag = (currentTag === enc) ? null : enc;
          applyFilters();
          return;
        }
        node = node.parentNode;
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      query = searchInput.value.trim().toLowerCase();
      applyFilters();
    });
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        searchInput.value = '';
        query = '';
        applyFilters();
        searchInput.blur();
      }
    });
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        searchInput.focus();
      }
    });
  }
})();
