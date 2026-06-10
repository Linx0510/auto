(function () {
  function escapeHtml(text) {
    if (typeof window.escapeHtml === 'function') {
      return window.escapeHtml(text);
    }
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function isSafeUrl(url) {
    if (typeof url === 'string' && url.charAt(0) === '/' && url.charAt(1) !== '/') {
      return true;
    }

    try {
      var parsed = new URL(url, window.location.origin);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  function renderLink(label, url) {
    var isRelative = url.charAt(0) === '/' && url.charAt(1) !== '/';
    var attrs = isRelative
      ? ' href="' + escapeHtml(url) + '"'
      : ' href="' +
        escapeHtml(url) +
        '" target="_blank" rel="noopener noreferrer"';

    return '<a class="ai-chat-link"' + attrs + '>' + label + '</a>';
  }

  function inlineMarkdown(text) {
    var out = text;

    out = out.replace(/`([^`\n]+)`/g, function (_, code) {
      return '<code>' + code + '</code>';
    });

    out = out.replace(/\*\*([^*\n]+)\*\*/g, function (_, bold) {
      return '<strong>' + bold + '</strong>';
    });

    out = out.replace(/\*([^*\n]+)\*/g, function (_, italic) {
      return '<em>' + italic + '</em>';
    });

    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, url) {
      if (!isSafeUrl(url)) {
        return label;
      }
      return renderLink(label, url);
    });

    return out;
  }

  function parseMarkdown(raw) {
    var text = raw == null ? '' : String(raw);
    if (!text.trim()) {
      return '';
    }

    var lines = escapeHtml(text).split('\n');
    var html = [];
    var inUl = false;
    var inOl = false;

    function closeLists() {
      if (inUl) {
        html.push('</ul>');
        inUl = false;
      }
      if (inOl) {
        html.push('</ol>');
        inOl = false;
      }
    }

    for (var i = 0; i < lines.length; i += 1) {
      var line = lines[i];
      var trimmed = line.trim();

      if (!trimmed) {
        closeLists();
        continue;
      }

      var heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        closeLists();
        var level = heading[1].length;
        html.push(
          '<h' + level + '>' + inlineMarkdown(heading[2]) + '</h' + level + '>'
        );
        continue;
      }

      var ulMatch = trimmed.match(/^[-*•]\s+(.+)$/);
      if (ulMatch) {
        if (inOl) {
          html.push('</ol>');
          inOl = false;
        }
        if (!inUl) {
          html.push('<ul>');
          inUl = true;
        }
        html.push('<li>' + inlineMarkdown(ulMatch[1]) + '</li>');
        continue;
      }

      var olMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
      if (olMatch) {
        if (inUl) {
          html.push('</ul>');
          inUl = false;
        }
        if (!inOl) {
          html.push('<ol>');
          inOl = true;
        }
        html.push('<li>' + inlineMarkdown(olMatch[1]) + '</li>');
        continue;
      }

      closeLists();
      html.push('<p>' + inlineMarkdown(trimmed) + '</p>');
    }

    closeLists();
    return html.join('');
  }

  window.parseAiChatMarkdown = parseMarkdown;
})();
