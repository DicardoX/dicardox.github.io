/* Posts section: tag filter + text search + hash-based view switching */
(function () {
  'use strict';

  // View switching: the posts panel replaces the homepage content when the
  // URL hash is #post-cards (driven by the masthead link, deep links and
  // browser back/forward)
  var POSTS_HASH = '#post-cards';
  var postsOn = false;
  var savedScrollY = 0;
  var pendingAnchor = null;

  function syncView() {
    var on = window.location.hash === POSTS_HASH;
    if (on === postsOn) { return; }
    postsOn = on;
    if (on) {
      savedScrollY = window.pageYOffset || 0;
      document.body.classList.add('post-full');
      window.scrollTo(0, 0);
    } else {
      document.body.classList.remove('post-full');
      if (pendingAnchor) {
        var target = document.getElementById(pendingAnchor);
        pendingAnchor = null;
        if (target && target.scrollIntoView) { target.scrollIntoView(); }
      } else {
        window.scrollTo(0, savedScrollY);
      }
    }
  }

  window.addEventListener('hashchange', syncView);
  syncView();

  // The theme's smoothScroll plugin (bound on all anchors) preventDefaults
  // in-page hash navigation, so the hash never changes and hashchange never
  // fires. Intercept nav clicks before the plugin sees them.
  // Returns true when the click was handled here.
  function handleNavAnchor(link) {
    var href = link.getAttribute('href') || '';
    if (/#post-cards$/.test(href)) {
      if (window.location.hash !== POSTS_HASH) {
        window.location.hash = 'post-cards';
      }
      return true;
    }
    if (postsOn && /^\/#/.test(href)) {
      pendingAnchor = href.slice(href.indexOf('#') + 1);
      window.location.hash = pendingAnchor;
      return true;
    }
    return false;
  }

  // Bound directly (and before main.min.js runs) so stopImmediatePropagation
  // keeps smoothScroll away from these links. Greedy-nav clones created later
  // are covered by the document-level fallback below.
  var navLinks = document.querySelectorAll('#site-nav a[href*="#"]');
  Array.prototype.forEach.call(navLinks, function (a) {
    a.addEventListener('click', function (e) {
      if (handleNavAnchor(a)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    });
  });

  document.addEventListener('click', function (e) {
    var node = e.target;
    while (node && node.tagName !== 'A' && node !== document.documentElement) {
      node = node.parentNode;
    }
    if (node && node.tagName === 'A' && handleNavAnchor(node)) {
      e.preventDefault();
    }
  });

  var root = document.getElementById('post-app');
  if (!root) { return; }

  var cardsEl = document.getElementById('post-cards-list');
  var allBtn = document.getElementById('post-filter-all');
  var searchInput = document.getElementById('post-search');
  var viewLabel = document.getElementById('post-view-label');
  var emptyMsg = document.getElementById('post-empty');

  var cards = Array.prototype.slice.call(root.querySelectorAll('.post-card'));
  var tagButtons = Array.prototype.slice.call(root.querySelectorAll('.post-tag'));

  var cardTags = cards.map(function (card) {
    var raw = card.getAttribute('data-tags') || '';
    return raw === '' ? [] : raw.split('||');
  });
  var cardText = cards.map(function (card) {
    return (card.textContent || '').toLowerCase();
  });

  // Cards render expanded in the HTML (readable without JS); collapse by default here
  cards.forEach(function (card) {
    card.classList.add('is-collapsed');
    var header = card.querySelector('.post-card__header');
    if (header) { header.setAttribute('aria-expanded', 'false'); }
  });

  function toggleCard(card, header) {
    var collapsed = card.classList.toggle('is-collapsed');
    header.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }

  var displays = {};
  tagButtons.forEach(function (b) {
    var nameEl = b.querySelector('.post-tag__name');
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

  // Clicking a tag chip filters by that tag; clicking a card header toggles it
  if (cardsEl) {
    cardsEl.addEventListener('click', function (e) {
      var node = e.target;
      var chip = null;
      var header = null;
      var card = null;
      while (node && node !== cardsEl) {
        if (node.classList) {
          if (!chip && node.classList.contains('post-chip')) { chip = node; }
          if (!header && node.classList.contains('post-card__header')) { header = node; }
          if (!card && node.classList.contains('post-card')) { card = node; }
        }
        node = node.parentNode;
      }
      if (chip) {
        var enc = chip.getAttribute('data-tag');
        currentTag = (currentTag === enc) ? null : enc;
        applyFilters();
        return;
      }
      if (header && card) {
        toggleCard(card, header);
      }
    });

    cardsEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') { return; }
      var node = e.target;
      while (node && node !== cardsEl) {
        if (node.classList && node.classList.contains('post-card__header')) {
          e.preventDefault();
          var card = node.parentNode;
          while (card && !card.classList.contains('post-card')) { card = card.parentNode; }
          if (card) { toggleCard(card, node); }
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
