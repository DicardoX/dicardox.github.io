/* Posts section: tag filter + text search + hash-based view switching
   + admin login (GitHub token) + add/edit/delete cards via the GitHub API */
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

  function bindTagButton(b) {
    b.addEventListener('click', function () {
      var enc = b.getAttribute('data-tag');
      currentTag = (currentTag === enc) ? null : enc;
      applyFilters();
    });
  }

  tagButtons.forEach(bindTagButton);

  if (allBtn) {
    allBtn.addEventListener('click', function () {
      currentTag = null;
      applyFilters();
    });
  }

  function closeAllMenus() {
    Array.prototype.forEach.call(root.querySelectorAll('.post-card__dropdown'), function (d) {
      d.hidden = true;
      var kb = d.parentNode ? d.parentNode.querySelector('.post-card__kebab') : null;
      if (kb) { kb.setAttribute('aria-expanded', 'false'); }
    });
  }

  document.addEventListener('click', function (e) {
    var node = e.target;
    while (node && node !== document.documentElement) {
      if (node.classList && node.classList.contains('post-card__menu')) { return; }
      node = node.parentNode;
    }
    closeAllMenus();
  });

  // Clicking a tag chip filters by that tag; clicking a card header toggles it;
  // the kebab menu opens card actions (edit, delete)
  if (cardsEl) {
    cardsEl.addEventListener('click', function (e) {
      var node = e.target;
      var chip = null;
      var header = null;
      var card = null;
      var kebab = null;
      var edit = null;
      var del = null;
      while (node && node !== cardsEl) {
        if (node.classList) {
          if (!chip && node.classList.contains('post-chip')) { chip = node; }
          if (!edit && node.classList.contains('post-card__edit')) { edit = node; }
          if (!del && node.classList.contains('post-card__delete')) { del = node; }
          if (!kebab && node.classList.contains('post-card__kebab')) { kebab = node; }
          if (!header && node.classList.contains('post-card__header')) { header = node; }
          if (!card && node.classList.contains('post-card')) { card = node; }
        }
        node = node.parentNode;
      }
      if (edit) {
        handleEdit(edit, card);
        return;
      }
      if (del) {
        handleDelete(del, card);
        return;
      }
      if (kebab) {
        var dd = kebab.parentNode.querySelector('.post-card__dropdown');
        var willOpen = dd && dd.hidden;
        closeAllMenus();
        if (dd) { dd.hidden = !willOpen; }
        kebab.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        return;
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

  /* ---------- Admin login (GitHub token) + add/delete via GitHub API ---------- */

  // The token is entered once via Admin Login, verified against the GitHub
  // account (GET /user + repo permission check) and stored only in this
  // browser's localStorage. It never appears in the repo sources.
  var TOKEN_KEY = 'post-cards-gh-token';
  var USER_KEY = 'post-cards-gh-user';

  var fab = document.getElementById('post-fab');
  var loginModal = document.getElementById('post-login-modal');
  var editorModal = document.getElementById('post-editor-modal');
  var loginBtn = document.getElementById('post-login-btn');
  var loginTokenInput = document.getElementById('post-login-token');
  var loginSubmit = document.getElementById('post-login-submit');
  var loginError = document.getElementById('post-login-error');
  var repo = fab ? (fab.getAttribute('data-repo') || '') : '';

  function openModal(m) { if (m) { m.hidden = false; } }
  function closeModal(m) { if (m) { m.hidden = true; } }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.hasAttribute && t.hasAttribute('data-close')) {
      closeModal(loginModal);
      closeModal(editorModal);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeModal(loginModal);
      closeModal(editorModal);
      closeAllMenus();
    }
  });

  function ghApi(method, url, token, bodyObj) {
    return fetch('https://api.github.com' + url, {
      method: method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: bodyObj ? JSON.stringify(bodyObj) : undefined
    });
  }

  function isAdmin() {
    return document.body.classList.contains('post-admin');
  }

  function setAdmin(user) {
    if (user) {
      document.body.classList.add('post-admin');
      if (loginBtn) {
        loginBtn.textContent = 'Logout';
        loginBtn.title = 'Signed in as @' + user.login;
      }
      try { localStorage.setItem(USER_KEY, JSON.stringify({ login: user.login })); } catch (e) { /* ignore */ }
    } else {
      document.body.classList.remove('post-admin');
      if (loginBtn) {
        loginBtn.textContent = 'Admin Login';
        loginBtn.title = '';
      }
      closeAllMenus();
      try {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
      } catch (e) { /* ignore */ }
    }
  }

  // Restore login state from this browser, then revalidate in the background
  (function restoreSession() {
    var user = null;
    try { user = JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (e) { /* ignore */ }
    var token = null;
    try { token = localStorage.getItem(TOKEN_KEY); } catch (e) { /* ignore */ }
    if (user && user.login) { setAdmin(user); }
    if (!token) { return; }
    ghApi('GET', '/user', token).then(function (res) {
      if (res.status === 401 || res.status === 403) {
        setAdmin(null);
        return null;
      }
      if (!res.ok) { return null; }
      return res.json();
    }).then(function (u) {
      if (u && u.login) { setAdmin({ login: u.login }); }
    }).catch(function () { /* offline: keep the cached session */ });
  })();

  if (loginBtn) {
    loginBtn.addEventListener('click', function () {
      if (isAdmin()) {
        setAdmin(null);
        return;
      }
      if (loginError) { loginError.hidden = true; }
      openModal(loginModal);
      if (loginTokenInput) { loginTokenInput.focus(); }
    });
  }

  function submitLogin() {
    var token = loginTokenInput.value.trim();
    if (!token) {
      loginError.textContent = 'Please paste a GitHub token.';
      loginError.hidden = false;
      return;
    }
    loginError.hidden = true;
    loginSubmit.disabled = true;
    loginSubmit.textContent = 'Signing in…';

    ghApi('GET', '/user', token)
      .then(function (res) {
        if (res.status === 401 || res.status === 403) { throw new Error('Invalid token.'); }
        if (!res.ok) { throw new Error('GitHub API error (' + res.status + ').'); }
        return res.json();
      })
      .then(function (user) {
        return ghApi('GET', '/repos/' + repo, token).then(function (res) {
          if (!res.ok) { throw new Error('Cannot access repo ' + repo + ' with this token.'); }
          return res.json().then(function (r) {
            if (!r.permissions || !r.permissions.push) {
              throw new Error('Token has no Contents write permission on ' + repo + '.');
            }
            return user;
          });
        });
      })
      .then(function (user) {
        try { localStorage.setItem(TOKEN_KEY, token); } catch (e) { /* ignore */ }
        setAdmin({ login: user.login });
        loginTokenInput.value = '';
        closeModal(loginModal);
      })
      .catch(function (e) {
        loginError.textContent = e.message || 'Network error — please retry.';
        loginError.hidden = false;
      })
      .then(function () {
        loginSubmit.disabled = false;
        loginSubmit.textContent = 'Sign in';
      });
  }

  if (loginSubmit) {
    loginSubmit.addEventListener('click', submitLogin);
    loginTokenInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { submitLogin(); }
    });
  }

  // The editor modal serves both "add" and "edit"; `editing` is null for add
  // and { card, path, sha } while an existing card is being edited
  var editing = null;
  var editorTitle = document.getElementById('post-editor-title');

  function clearEditorFields() {
    document.getElementById('post-new-title').value = '';
    document.getElementById('post-new-tags').value = '';
    document.getElementById('post-new-body').value = '';
  }

  function openEditor() {
    if (editing) { clearEditorFields(); }
    editing = null;
    if (editorTitle) { editorTitle.textContent = 'New card'; }
    if (addBtn) { addBtn.textContent = 'Add card'; }
    var err = document.getElementById('post-editor-error');
    if (err) { err.hidden = true; }
    openModal(editorModal);
    var t = document.getElementById('post-new-title');
    if (t) { t.focus(); }
  }

  function unquoteYaml(s) {
    s = s.trim();
    if (s.length >= 2 && s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') {
      s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    return s;
  }

  function parseTagList(value) {
    var tags = [];
    value = value.trim();
    if (value.charAt(0) === '[' && value.charAt(value.length - 1) === ']') {
      value.slice(1, -1).split(',').forEach(function (t) {
        t = unquoteYaml(t);
        if (t && tags.indexOf(t) === -1) { tags.push(t); }
      });
    }
    return tags;
  }

  // Split a card source file into front-matter fields and the Markdown body
  function parseCardSource(text) {
    var parsed = { title: '', tags: [], body: text };
    var m = text.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/);
    if (!m) { return parsed; }
    parsed.body = text.slice(m[0].length).replace(/^[\r\n]+/, '').replace(/[\r\n]+$/, '');
    var inTags = false;
    m[1].split(/\r?\n/).forEach(function (line) {
      if (inTags && /^\s*-\s+/.test(line)) {
        var item = unquoteYaml(line.replace(/^\s*-\s+/, ''));
        if (item && parsed.tags.indexOf(item) === -1) { parsed.tags.push(item); }
        return;
      }
      inTags = false;
      var t = line.match(/^title\s*:\s*(.*)$/);
      if (t) { parsed.title = unquoteYaml(t[1]); return; }
      var g = line.match(/^tags\s*:\s*(.*)$/);
      if (g) {
        if (g[1].trim() === '') { inTags = true; }
        else { parsed.tags = parseTagList(g[1]); }
      }
    });
    return parsed;
  }

  function b64decode(s) {
    return decodeURIComponent(escape(atob(s.replace(/\s/g, ''))));
  }

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }

  function openEditorForCard(card, path, sha, source) {
    var parsed = parseCardSource(source);
    editing = { card: card, path: path, sha: sha };
    if (editorTitle) { editorTitle.textContent = 'Edit card'; }
    if (addBtn) { addBtn.textContent = 'Save'; }
    document.getElementById('post-new-title').value = parsed.title;
    document.getElementById('post-new-tags').value = parsed.tags.join(', ');
    document.getElementById('post-new-body').value = parsed.body;
    var err = document.getElementById('post-editor-error');
    if (err) { err.hidden = true; }
    openModal(editorModal);
    document.getElementById('post-new-title').focus();
  }

  function handleEdit(editBtn, card) {
    var path = editBtn.getAttribute('data-path');
    if (!path || !card) { return; }
    closeAllMenus();
    var token = getToken();
    if (!token) {
      window.alert('Please sign in first (Admin Login on the left).');
      return;
    }
    editBtn.disabled = true;
    editBtn.textContent = 'Loading…';

    ghApi('GET', '/repos/' + repo + '/contents/' + encodeURI(path), token)
      .then(function (res) {
        if (res.status === 401 || res.status === 403) {
          setAdmin(null);
          throw new Error('GitHub rejected the saved token — please sign in again via Admin Login.');
        }
        if (!res.ok) { throw new Error('GitHub API error (' + res.status + ').'); }
        return res.json();
      })
      .then(function (data) {
        openEditorForCard(card, path, data.sha, b64decode(data.content));
      })
      .catch(function (e) {
        window.alert(e.message || 'Network error — please retry.');
      })
      .then(function () {
        editBtn.disabled = false;
        editBtn.textContent = 'Edit';
      });
  }

  if (fab) {
    fab.addEventListener('click', function () {
      if (!isAdmin()) {
        if (loginError) { loginError.hidden = true; }
        openModal(loginModal);
        if (loginTokenInput) { loginTokenInput.focus(); }
        return;
      }
      openEditor();
    });
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function fmtDate(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function fmtUpdated(d) {
    var off = -d.getTimezoneOffset();
    var sign = off >= 0 ? '+' : '-';
    var abs = Math.abs(off);
    return fmtDate(d) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds())
      + ' ' + sign + pad2(Math.floor(abs / 60)) + pad2(abs % 60);
  }

  function slugify(s) {
    var slug = s.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
    if (slug.length > 50) { slug = slug.slice(0, 50).replace(/-+$/g, ''); }
    return slug || 'card';
  }

  function yamlQuote(s) {
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function b64encode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function parseTagsInput(raw) {
    var out = [];
    raw.split(',').forEach(function (t) {
      t = t.trim().replace(/^#/, '');
      if (t && out.indexOf(t) === -1) { out.push(t); }
    });
    return out;
  }

  // Tags come only from the Tags field of the editor modal
  function tagKeys(tags) {
    var keys = [];
    var disp = {};
    tags.forEach(function (t) {
      var k = t.toLowerCase();
      if (keys.indexOf(k) === -1) { keys.push(k); disp[k] = t; }
    });
    return { keys: keys, disp: disp };
  }

  // Sidebar stats / tag counts (updated live on add/delete; the persistent
  // state refreshes when GitHub Pages rebuilds)
  function refreshStats() {
    var nums = root.querySelectorAll('.post-stat__num');
    if (nums[0]) { nums[0].textContent = cards.length; }
    if (nums[1]) { nums[1].textContent = tagButtons.length; }
  }

  function addTagButton(key, display, count) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'post-tag';
    b.setAttribute('data-tag', key);
    b.innerHTML = '<span class="post-tag__hash">#</span><span class="post-tag__name"></span><span class="post-tag__count"></span>';
    b.querySelector('.post-tag__name').textContent = display;
    b.querySelector('.post-tag__count').textContent = count;
    bindTagButton(b);
    var list = document.getElementById('post-tag-list');
    var inserted = false;
    Array.prototype.forEach.call(list.children, function (other) {
      if (inserted) { return; }
      var nameEl = other.querySelector('.post-tag__name');
      if (nameEl && nameEl.textContent.toLowerCase() > display.toLowerCase()) {
        list.insertBefore(b, other);
        inserted = true;
      }
    });
    if (!inserted) { list.appendChild(b); }
    tagButtons.push(b);
    displays[key] = display;
  }

  function adjustTagCounts(keys, delta, disp) {
    keys.forEach(function (k) {
      var btn = null;
      tagButtons.forEach(function (b) {
        if (b.getAttribute('data-tag') === k) { btn = b; }
      });
      if (btn) {
        var countEl = btn.querySelector('.post-tag__count');
        var n = (parseInt(countEl.textContent, 10) || 0) + delta;
        if (n <= 0) {
          btn.parentNode.removeChild(btn);
          tagButtons.splice(tagButtons.indexOf(btn), 1);
          delete displays[k];
          if (currentTag === k) {
            currentTag = null;
            applyFilters();
          }
        } else {
          countEl.textContent = n;
        }
      } else if (delta > 0) {
        addTagButton(k, (disp && disp[k]) || k, delta);
      }
    });
    refreshStats();
  }

  // Prepend the new card to the feed right away (full markdown rendering
  // happens once GitHub Pages rebuilds)
  function prependCard(opts) {
    var tk = tagKeys(opts.tags);
    var keys = tk.keys;
    var disp = tk.disp;

    var chipsHtml = keys.map(function (k) {
      return '<button type="button" class="post-chip" data-tag="' + escapeHtml(k) + '">#' + escapeHtml(disp[k]) + '</button>';
    }).join('');

    var article = document.createElement('article');
    article.className = 'post-card is-collapsed';
    article.setAttribute('data-tags', keys.join('||'));
    article.innerHTML =
      '<header class="post-card__header" role="button" tabindex="0" aria-expanded="false">'
      + '<svg class="post-card__chevron" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>'
      + '<div class="post-card__head-main">'
      + '<div class="post-card__titlerow">'
      + '<span class="post-card__title">' + escapeHtml(opts.title) + '</span>'
      + '<span class="post-card__time" title="Last updated">' + escapeHtml(opts.timeText) + '</span>'
      + '<span class="post-card__menu">'
      + '<button type="button" class="post-card__kebab" aria-label="Card actions" aria-haspopup="true" aria-expanded="false">'
      + '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><circle cx="8" cy="3" r="1.6"/><circle cx="8" cy="8" r="1.6"/><circle cx="8" cy="13" r="1.6"/></svg>'
      + '</button>'
      + '<span class="post-card__dropdown" hidden>'
      + '<button type="button" class="post-card__edit" data-path="' + escapeHtml(opts.path) + '">Edit</button>'
      + '<button type="button" class="post-card__delete" data-path="' + escapeHtml(opts.path) + '">Delete</button>'
      + '</span>'
      + '</span>'
      + '</div>'
      + (chipsHtml ? '<div class="post-card__tags">' + chipsHtml + '</div>' : '')
      + '</div></header>'
      + '<div class="post-card__body">' + escapeHtml(opts.body).replace(/\n/g, '<br>') + '</div>';

    cardsEl.insertBefore(article, cardsEl.firstChild);
    cards.push(article);
    cardTags.push(keys);
    cardText.push((opts.title + ' ' + keys.join(' ') + ' ' + opts.body).toLowerCase());
    applyFilters();
    article.scrollIntoView();
    return { keys: keys, disp: disp };
  }

  function removeCard(card) {
    var i = cards.indexOf(card);
    var keys = [];
    if (i !== -1) {
      keys = cardTags[i];
      cards.splice(i, 1);
      cardTags.splice(i, 1);
      cardText.splice(i, 1);
    }
    if (card.parentNode) { card.parentNode.removeChild(card); }
    adjustTagCounts(keys, -1, null);
    applyFilters();
  }

  // Reflect an edited card in the feed right away (full markdown rendering
  // happens once GitHub Pages rebuilds); the card moves to the top because
  // the feed is sorted by updated time
  function updateCard(card, opts) {
    var tk = tagKeys(opts.tags);
    var keys = tk.keys;
    var i = cards.indexOf(card);
    var oldKeys = i !== -1 ? cardTags[i] : [];

    card.setAttribute('data-tags', keys.join('||'));
    var titleEl = card.querySelector('.post-card__title');
    if (titleEl) { titleEl.textContent = opts.title; }
    var timeEl = card.querySelector('.post-card__time');
    if (timeEl) { timeEl.textContent = opts.timeText; }

    var chipsHtml = keys.map(function (k) {
      return '<button type="button" class="post-chip" data-tag="' + escapeHtml(k) + '">#' + escapeHtml(tk.disp[k]) + '</button>';
    }).join('');
    var tagsEl = card.querySelector('.post-card__tags');
    if (chipsHtml) {
      if (tagsEl) {
        tagsEl.innerHTML = chipsHtml;
      } else {
        var headMain = card.querySelector('.post-card__head-main');
        if (headMain) {
          tagsEl = document.createElement('div');
          tagsEl.className = 'post-card__tags';
          tagsEl.innerHTML = chipsHtml;
          headMain.appendChild(tagsEl);
        }
      }
    } else if (tagsEl) {
      tagsEl.parentNode.removeChild(tagsEl);
    }

    var bodyEl = card.querySelector('.post-card__body');
    if (bodyEl) { bodyEl.innerHTML = escapeHtml(opts.body).replace(/\n/g, '<br>'); }

    if (i !== -1) {
      cardTags[i] = keys;
      cardText[i] = (opts.title + ' ' + keys.join(' ') + ' ' + opts.body).toLowerCase();
    }
    adjustTagCounts(oldKeys, -1, null);
    adjustTagCounts(keys, 1, tk.disp);
    if (card.parentNode === cardsEl && cardsEl.firstChild !== card) {
      cardsEl.insertBefore(card, cardsEl.firstChild);
    }
    applyFilters();
    card.scrollIntoView();
  }

  function checkResponse(res) {
    if (res.status === 200 || res.status === 201) { return; }
    if (res.status === 401 || res.status === 403) {
      setAdmin(null);
      throw new Error('GitHub rejected the saved token — please sign in again via Admin Login.');
    }
    return res.json().then(function (d) {
      throw new Error('GitHub API error (' + res.status + '): ' + (d && d.message ? d.message : res.statusText));
    });
  }

  var addBtn = document.getElementById('post-add-submit');
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      var title = document.getElementById('post-new-title').value.trim();
      var tagsInput = document.getElementById('post-new-tags').value;
      var body = document.getElementById('post-new-body').value.trim();
      var err = document.getElementById('post-editor-error');

      if (!title || !body) {
        err.textContent = 'Title and content are required.';
        err.hidden = false;
        return;
      }
      if (!repo) {
        err.textContent = 'Missing site.repository in _config.yml.';
        err.hidden = false;
        return;
      }
      var token = getToken();
      if (!token) {
        err.textContent = 'Please sign in first (Admin Login on the left).';
        err.hidden = false;
        return;
      }
      err.hidden = true;
      addBtn.disabled = true;
      addBtn.textContent = editing ? 'Saving…' : 'Adding…';

      var now = new Date();
      var fmTags = parseTagsInput(tagsInput);
      var lines = ['---', 'title: ' + yamlQuote(title)];
      if (fmTags.length) { lines.push('tags: [' + fmTags.map(yamlQuote).join(', ') + ']'); }
      lines.push('updated: ' + yamlQuote(fmtUpdated(now)));
      lines.push('---', '', body, '');
      var timeText = fmtDate(now) + ' ' + pad2(now.getHours()) + ':' + pad2(now.getMinutes());

      var req;
      if (editing) {
        req = ghApi('PUT', '/repos/' + repo + '/contents/' + encodeURI(editing.path), token, {
          message: 'Update post card: ' + title,
          content: b64encode(lines.join('\n')),
          sha: editing.sha
        });
      } else {
        var filename = fmtDate(now) + '-' + pad2(now.getHours()) + '-' + pad2(now.getMinutes()) + '-' + slugify(title) + '.md';
        req = ghApi('PUT', '/repos/' + repo + '/contents/_post/' + encodeURIComponent(filename), token, {
          message: 'Add post card: ' + title,
          content: b64encode(lines.join('\n'))
        });
      }

      req
        .then(checkResponse)
        .then(function () {
          closeModal(editorModal);
          if (editing) {
            updateCard(editing.card, { title: title, tags: fmTags, body: body, timeText: timeText });
            editing = null;
          } else {
            var r = prependCard({
              title: title,
              tags: fmTags,
              body: body,
              path: '_post/' + filename,
              timeText: timeText
            });
            adjustTagCounts(r.keys, 1, r.disp);
            clearEditorFields();
          }
        })
        .catch(function (e) {
          err.textContent = e.message || 'Network error — please retry.';
          err.hidden = false;
        })
        .then(function () {
          addBtn.disabled = false;
          addBtn.textContent = editing ? 'Save' : 'Add card';
        });
    });
  }

  function handleDelete(delBtn, card) {
    var path = delBtn.getAttribute('data-path');
    if (!path || !card) { return; }
    var titleEl = card.querySelector('.post-card__title');
    var title = titleEl ? titleEl.textContent : path;
    var token = null;
    try { token = localStorage.getItem(TOKEN_KEY); } catch (e) { /* ignore */ }
    if (!token) {
      window.alert('Please sign in first (Admin Login on the left).');
      return;
    }
    if (!window.confirm('Delete "' + title + '"?\nThis removes ' + path + ' from the repo; the site rebuilds in about a minute.')) {
      return;
    }
    delBtn.disabled = true;
    delBtn.textContent = 'Deleting…';

    var apiPath = '/repos/' + repo + '/contents/' + encodeURI(path);
    ghApi('GET', apiPath, token)
      .then(function (res) {
        if (res.status === 404) { return null; }
        if (!res.ok) { throw new Error('GitHub API error (' + res.status + ').'); }
        return res.json();
      })
      .then(function (data) {
        if (!data) { return; } // already gone remotely; just remove locally
        return ghApi('DELETE', apiPath, token, {
          message: 'Delete post card: ' + title,
          sha: data.sha
        }).then(function (res) {
          if (res.ok) { return; }
          if (res.status === 401 || res.status === 403) {
            setAdmin(null);
            throw new Error('GitHub rejected the saved token — please sign in again via Admin Login.');
          }
          return res.json().then(function (d) {
            throw new Error('GitHub API error (' + res.status + '): ' + (d && d.message ? d.message : res.statusText));
          });
        });
      })
      .then(function () {
        removeCard(card);
      })
      .catch(function (e) {
        window.alert(e.message || 'Network error — please retry.');
        delBtn.disabled = false;
        delBtn.textContent = 'Delete';
      });
  }
})();
