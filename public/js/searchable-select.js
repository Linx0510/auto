/**
 * Searchable dropdown (combobox) without external dependencies.
 */
class SearchableSelect {
  constructor(container, options = {}) {
    this.container = container;
    this.placeholder = options.placeholder || 'Выберите...';
    this.disabled = Boolean(options.disabled);
    this.items = [];
    this.selected = null;
    this.highlightIndex = -1;
    this.isOpen = false;
    this.onChange = typeof options.onChange === 'function' ? options.onChange : null;

    this.container.classList.add('searchable-select');
    this.container.innerHTML = '';
    this._buildDom();
    this._bindEvents();

    if (options.disabled) {
      this.setDisabled(true);
    }
  }

  _buildDom() {
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'searchable-select__input form-control';
    this.input.setAttribute('autocomplete', 'off');
    this.input.setAttribute('role', 'combobox');
    this.input.setAttribute('aria-expanded', 'false');
    this.input.setAttribute('aria-haspopup', 'listbox');
    this.input.placeholder = this.placeholder;

    this.dropdown = document.createElement('div');
    this.dropdown.className = 'searchable-select__dropdown';
    this.dropdown.setAttribute('role', 'listbox');
    this.dropdown.hidden = true;

    this.list = document.createElement('ul');
    this.list.className = 'searchable-select__list';
    this.dropdown.appendChild(this.list);

    this.container.appendChild(this.input);
    this.container.appendChild(this.dropdown);
  }

  _bindEvents() {
    this.input.addEventListener('focus', () => this.open());
    this.input.addEventListener('input', () => {
      this.selected = null;
      this.input.removeAttribute('data-value');
      this._renderList();
      this.open();
    });
    this.input.addEventListener('keydown', (e) => this._onKeyDown(e));
    this.input.addEventListener('blur', () => {
      window.setTimeout(() => this.close(), 150);
    });

    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.close();
      }
    });
  }

  setItems(items) {
    this.items = Array.isArray(items) ? items.slice() : [];
    this._renderList();
  }

  setDisabled(disabled) {
    this.disabled = Boolean(disabled);
    this.input.disabled = this.disabled;
    if (this.disabled) {
      this.close();
    }
  }

  getValue() {
    if (!this.selected) {
      return null;
    }
    return {
      id: this.selected.id,
      name: this.selected.name,
      isOther: Boolean(this.selected.isOther)
    };
  }

  clear() {
    this.selected = null;
    this.input.value = '';
    this.input.removeAttribute('data-value');
    this.highlightIndex = -1;
    this._renderList();
    this._emitChange();
  }

  setValueById(id) {
    const item = this.items.find((entry) => String(entry.id) === String(id));
    if (!item) {
      this.clear();
      return;
    }
    this._selectItem(item, false);
  }

  open() {
    if (this.disabled) {
      return;
    }
    this.isOpen = true;
    this.dropdown.hidden = false;
    this.input.setAttribute('aria-expanded', 'true');
    this._renderList();
  }

  close() {
    this.isOpen = false;
    this.dropdown.hidden = true;
    this.input.setAttribute('aria-expanded', 'false');
    this.highlightIndex = -1;
    if (this.selected) {
      this.input.value = this.selected.name;
    }
  }

  _filteredItems() {
    const query = this.input.value.trim().toLowerCase();
    if (!query) {
      return this.items;
    }
    return this.items.filter((item) => item.name.toLowerCase().includes(query));
  }

  _renderList() {
    const filtered = this._filteredItems();
    const regular = filtered.filter((item) => !item.isOther);
    const other = filtered.filter((item) => item.isOther);
    const ordered = regular.concat(other);

    this.list.innerHTML = '';

    if (ordered.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'searchable-select__empty';
      empty.textContent = 'Ничего не найдено';
      this.list.appendChild(empty);
      return;
    }

    ordered.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'searchable-select__option';
      if (item.isOther) {
        li.classList.add('searchable-select__option--other');
      }
      if (this.highlightIndex === index) {
        li.classList.add('is-highlighted');
      }
      if (this.selected && String(this.selected.id) === String(item.id)) {
        li.classList.add('is-selected');
      }
      li.textContent = item.name;
      li.setAttribute('role', 'option');
      li.dataset.index = String(index);
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this._selectItem(item, true);
      });
      this.list.appendChild(li);
    });

    this._orderedItems = ordered;
  }

  _selectItem(item, closeDropdown) {
    this.selected = item;
    this.input.value = item.name;
    this.input.setAttribute('data-value', String(item.id));
    if (closeDropdown) {
      this.close();
    }
    this._emitChange();
  }

  _emitChange() {
    if (this.onChange) {
      this.onChange(this.getValue());
    }
  }

  _onKeyDown(e) {
    if (this.disabled) {
      return;
    }

    const items = this._orderedItems || [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!this.isOpen) {
        this.open();
      }
      this.highlightIndex = Math.min(this.highlightIndex + 1, items.length - 1);
      this._renderList();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!this.isOpen) {
        this.open();
      }
      this.highlightIndex = Math.max(this.highlightIndex - 1, 0);
      this._renderList();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.isOpen && this.highlightIndex >= 0 && items[this.highlightIndex]) {
        this._selectItem(items[this.highlightIndex], true);
      }
    } else if (e.key === 'Escape') {
      this.close();
    }
  }
}

window.SearchableSelect = SearchableSelect;
