/* Memo Cards page: tag filter + counts (no jQuery needed) */
(function () {
  'use strict';

  var root = document.getElementById('memo-app');
  if (!root) { return; }

  var cardsEl = document.getElementById('memo-cards');
  var sidebar = document.getElementById('memo-tag-list');
  var allBtn = document.getElementById('memo-filter-all');
  var emptyMsg = document.getElementById('memo-empty');
  var current = null;

  var cards = Array.prototype.slice.call(root.querySelectorAll('.memo-card'));
  var chips = Array.prototype.slice.call(root.querySelectorAll('.memo-chip'));

  // Display names for tags: encoded tag (lowercase) -> label as written on the chip
  var displays = {};
  chips.forEach(function (chip) {
    var enc = chip.getAttribute('data-tag') || '';
    if (enc && !displays[enc]) {
      displays[enc] = chip.textContent.replace(/^#/, '');
    }
  });

  // Count cards per tag
  var counts = {};
  var cardTags = cards.map(function (card) {
    var raw = card.getAttribute('data-tags') || '';
    var tags = raw === '' ? [] : raw.split('||');
    tags.forEach(function (enc) {
      if (enc) { counts[enc] = (counts[enc] || 0) + 1; }
    });
    return tags;
  });

  function countBadge(n) {
    var s = document.createElement('span');
    s.className = 'memo-tag-filter__count';
    s.textContent = n;
    return s;
  }

  // Sidebar tag buttons, alphabetically ordered
  Object.keys(counts).sort(function (a, b) {
    return (displays[a] || a).toLowerCase().localeCompare((displays[b] || b).toLowerCase());
  }).forEach(function (enc) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'memo-tag-filter';
    b.setAttribute('data-tag', enc);
    var label = document.createElement('span');
    label.textContent = '#' + (displays[enc] || enc);
    b.appendChild(label);
    b.appendChild(countBadge(counts[enc]));
    b.addEventListener('click', function () {
      setFilter(current === enc ? null : enc);
    });
    sidebar.appendChild(b);
  });

  if (allBtn) {
    allBtn.appendChild(countBadge(cards.length));
    allBtn.addEventListener('click', function () { setFilter(null); });
  }

  // Clicking a tag chip on a card filters by that tag
  if (cardsEl) {
    cardsEl.addEventListener('click', function (e) {
      var node = e.target;
      while (node && node !== cardsEl) {
        if (node.classList && node.classList.contains('memo-chip')) {
          var enc = node.getAttribute('data-tag');
          setFilter(current === enc ? null : enc);
          return;
        }
        node = node.parentNode;
      }
    });
  }

  function setFilter(enc) {
    current = enc;
    var visible = 0;
    cards.forEach(function (card, i) {
      var show = !enc || cardTags[i].indexOf(enc) !== -1;
      card.style.display = show ? '' : 'none';
      if (show) { visible += 1; }
    });
    var buttons = root.querySelectorAll('.memo-tag-filter');
    Array.prototype.forEach.call(buttons, function (b) {
      var tag = b.getAttribute('data-tag') || '';
      b.classList.toggle('is-active', tag === (enc || ''));
    });
    if (emptyMsg) {
      emptyMsg.hidden = !(enc && visible === 0);
    }
  }
})();
