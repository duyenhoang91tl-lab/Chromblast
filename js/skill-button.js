/**
 * skillButton.js
 *
 * Nút kỹ năng + thanh nạp 3 vạch theo mục 6 của spec:
 * - Mỗi lần ăn thành công (hợp lệ) lấp 1 vạch.
 * - Đủ 3 vạch mới bấm dùng được, dùng xong reset về 0.
 * - KHÔNG reset khi bị trúng skill đối thủ — file này chỉ có addCharge()/reset(),
 *   không có hàm nào gọi khi "bị tấn công", nên UI tự động tuân theo đúng luật đó
 *   miễn là code gọi ngoài không lỡ tay gọi reset() khi bị đối thủ đánh trúng.
 *
 * Dùng:
 *   const skillBtn = new SkillButton(document.getElementById('skill-btn'), {
 *     maxCharge: 3,
 *     onActivate: () => { ... dùng kỹ năng ... },
 *   });
 *   skillBtn.addCharge(1); // gọi mỗi lần ăn thành công
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SkillButton = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class SkillButton {
    /**
     * @param {HTMLElement} el - element nút (thường là <button> hoặc <div role="button">)
     * @param {object} [options]
     * @param {number} [options.maxCharge=3] - số vạch cần để dùng skill (mục 6: 3 vạch)
     * @param {() => void} [options.onActivate] - callback khi bấm nút VÀ đã đủ vạch
     * @param {string} [options.readyClass='skill-ready']
     */
    constructor(el, options = {}) {
      if (!el) throw new Error('SkillButton cần 1 element hợp lệ');

      this.el = el;
      this.maxCharge = options.maxCharge ?? 3;
      this.charge = 0;
      this.onActivate = options.onActivate || (() => {});
      this.readyClass = options.readyClass || 'skill-ready';

      this._buildSegments();
      this._onClick = this._handleClick.bind(this);
      this.el.addEventListener('click', this._onClick);
      this._render();
    }

    _buildSegments() {
      this.el.classList.add('skill-button');
      this.segmentsEl = document.createElement('div');
      this.segmentsEl.className = 'skill-segments';
      this.segmentEls = [];
      for (let i = 0; i < this.maxCharge; i++) {
        const seg = document.createElement('span');
        seg.className = 'skill-segment';
        this.segmentsEl.appendChild(seg);
        this.segmentEls.push(seg);
      }
      this.el.appendChild(this.segmentsEl);
    }

    _handleClick() {
      if (this.charge < this.maxCharge) return; // chưa đủ vạch, bấm cũng không có tác dụng
      this.onActivate();
      this.reset();
    }

    /**
     * Cộng thêm vạch nạp (mặc định +1, gọi mỗi lần ăn thành công theo mục 6).
     * Vạch không vượt quá maxCharge.
     * @param {number} [amount=1]
     */
    addCharge(amount = 1) {
      this.charge = Math.min(this.maxCharge, this.charge + amount);
      this._render();
    }

    /** Reset về 0 vạch — chỉ gọi khi CHÍNH người chơi này vừa dùng xong skill (mục 6). */
    reset() {
      this.charge = 0;
      this._render();
    }

    /** true nếu đã đủ vạch để dùng skill. */
    isReady() {
      return this.charge >= this.maxCharge;
    }

    _render() {
      this.segmentEls.forEach((seg, index) => {
        seg.classList.toggle('filled', index < this.charge);
      });
      this.el.classList.toggle(this.readyClass, this.isReady());
      this.el.setAttribute('aria-disabled', String(!this.isReady()));
    }

    destroy() {
      this.el.removeEventListener('click', this._onClick);
    }
  }

  return SkillButton;
});
