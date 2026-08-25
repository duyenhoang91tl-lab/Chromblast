/**
 * healthBar.js
 *
 * Thanh máu + tên người chơi hiển thị trên đầu nhân vật (mục D.5 bản gốc, nhắc lại ở Task 10).
 * Thuần vanilla JS, không phụ thuộc framework.
 *
 * Dùng:
 *   const bar = new HealthBarHUD(document.getElementById('player-1-hud'), {
 *     name: 'Rùa Con',
 *     maxHP: 30,
 *     isOwnTeam: true,
 *   });
 *   bar.update(currentHP); // gọi mỗi khi máu thay đổi
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HealthBarHUD = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class HealthBarHUD {
    /**
     * @param {HTMLElement} el - container sẽ chứa tên + thanh máu
     * @param {object} options
     * @param {string} options.name - tên hiển thị
     * @param {number} options.maxHP - máu tối đa để tính % thanh máu (mục 2: mặc định 30, nhưng
     *                                  truyền vào vì maxHP hiệu dụng có thể đổi nếu game cho hồi/tăng trần)
     * @param {boolean} [options.isOwnTeam=false] - đổi màu thanh máu để phân biệt phe mình/địch
     */
    constructor(el, options) {
      if (!el) throw new Error('HealthBarHUD cần 1 element hợp lệ');
      if (!options || typeof options.maxHP !== 'number') {
        throw new Error('HealthBarHUD cần options.maxHP');
      }

      this.el = el;
      this.name = options.name || '';
      this.maxHP = options.maxHP;
      this.isOwnTeam = !!options.isOwnTeam;
      this.currentHP = this.maxHP;

      this._buildDom();
      this.update(this.maxHP);
    }

    _buildDom() {
      this.el.classList.add('health-bar-hud');
      this.el.classList.toggle('own-team', this.isOwnTeam);
      this.el.classList.toggle('enemy-team', !this.isOwnTeam);

      this.nameEl = document.createElement('div');
      this.nameEl.className = 'health-bar-name';
      this.nameEl.textContent = this.name;

      this.trackEl = document.createElement('div');
      this.trackEl.className = 'health-bar-track';

      this.fillEl = document.createElement('div');
      this.fillEl.className = 'health-bar-fill';
      this.trackEl.appendChild(this.fillEl);

      this.el.appendChild(this.nameEl);
      this.el.appendChild(this.trackEl);
    }

    /**
     * Cập nhật máu hiện tại. currentHP <= 0 -> thêm class 'eliminated' (mục 4: loại vĩnh viễn).
     * @param {number} currentHP
     */
    update(currentHP) {
      this.currentHP = currentHP;
      const ratio = Math.max(0, Math.min(1, currentHP / this.maxHP));
      this.fillEl.style.width = `${ratio * 100}%`;
      this.el.classList.toggle('eliminated', currentHP <= 0);
      this.el.classList.toggle('low-hp', currentHP > 0 && ratio <= 0.25);
    }

    destroy() {
      if (this.el && this.el.parentNode) {
        this.el.innerHTML = '';
      }
    }
  }

  return HealthBarHUD;
});
