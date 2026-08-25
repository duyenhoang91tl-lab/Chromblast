/**
 * joystick.js
 *
 * Joystick ảo (virtual joystick) cho điều khiển di chuyển trong "Muông Thú Đại Chiến".
 * Thuần vanilla JS, hỗ trợ cả touch (mobile) lẫn chuột (test trên desktop).
 * Không phụ thuộc framework nào — gắn trực tiếp bằng <script src="js/joystick.js">.
 *
 * Dùng:
 *   const joystick = new BattleJoystick(document.getElementById('joystick-zone'), {
 *     maxRadius: 50,
 *     onMove: (vector) => { ... }, // vector = { dx, dy, magnitude, angle }
 *     onEnd: () => { ... },
 *   });
 *   joystick.destroy(); // gỡ listener khi rời màn chơi
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BattleJoystick = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class BattleJoystick {
    /**
     * @param {HTMLElement} container - vùng chạm để kích hoạt joystick (thường là nửa trái màn hình)
     * @param {object} [options]
     * @param {number} [options.maxRadius=50] - bán kính tối đa (px) núm joystick di chuyển khỏi tâm
     * @param {number} [options.deadZone=0.1] - ngưỡng magnitude (0..1) dưới mức này coi như không di chuyển
     * @param {(vector: {dx:number, dy:number, magnitude:number, angle:number}) => void} [options.onMove]
     * @param {() => void} [options.onEnd]
     * @param {string} [options.baseClass='joystick-base']
     * @param {string} [options.knobClass='joystick-knob']
     */
    constructor(container, options = {}) {
      if (!container) throw new Error('BattleJoystick cần 1 container element hợp lệ');

      this.container = container;
      this.maxRadius = options.maxRadius ?? 50;
      this.deadZone = options.deadZone ?? 0.1;
      this.onMove = options.onMove || (() => {});
      this.onEnd = options.onEnd || (() => {});

      this.active = false;
      this.activePointerId = null;
      this.originX = 0;
      this.originY = 0;

      this._buildDom(options.baseClass || 'joystick-base', options.knobClass || 'joystick-knob');
      this._bindEvents();
    }

    _buildDom(baseClass, knobClass) {
      this.baseEl = document.createElement('div');
      this.baseEl.className = baseClass;

      this.knobEl = document.createElement('div');
      this.knobEl.className = knobClass;

      this.baseEl.appendChild(this.knobEl);
      this.container.appendChild(this.baseEl);
      this.baseEl.style.display = 'none'; // chỉ hiện khi người chơi chạm xuống (dynamic joystick)
    }

    _bindEvents() {
      this._onPointerDown = this._handlePointerDown.bind(this);
      this._onPointerMove = this._handlePointerMove.bind(this);
      this._onPointerUp = this._handlePointerUp.bind(this);

      this.container.addEventListener('pointerdown', this._onPointerDown);
      // gắn move/up lên window để không mất joystick khi kéo ra ngoài vùng container
      window.addEventListener('pointermove', this._onPointerMove);
      window.addEventListener('pointerup', this._onPointerUp);
      window.addEventListener('pointercancel', this._onPointerUp);
    }

    _handlePointerDown(evt) {
      if (this.active) return; // chỉ nhận 1 ngón/1 con trỏ tại 1 thời điểm
      this.active = true;
      this.activePointerId = evt.pointerId;

      const rect = this.container.getBoundingClientRect();
      this.originX = evt.clientX;
      this.originY = evt.clientY;

      // Joystick dynamic: hiện tại đúng vị trí vừa chạm xuống, giới hạn trong container
      const localX = Math.min(Math.max(evt.clientX - rect.left, 0), rect.width);
      const localY = Math.min(Math.max(evt.clientY - rect.top, 0), rect.height);
      this.baseEl.style.left = `${localX}px`;
      this.baseEl.style.top = `${localY}px`;
      this.baseEl.style.display = 'block';
      this._setKnobOffset(0, 0);
    }

    _handlePointerMove(evt) {
      if (!this.active || evt.pointerId !== this.activePointerId) return;

      let dx = evt.clientX - this.originX;
      let dy = evt.clientY - this.originY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const clampedDistance = Math.min(distance, this.maxRadius);
      const angle = Math.atan2(dy, dx);
      const knobX = Math.cos(angle) * clampedDistance;
      const knobY = Math.sin(angle) * clampedDistance;

      this._setKnobOffset(knobX, knobY);

      const magnitudeRaw = distance / this.maxRadius;
      const magnitude = Math.min(1, magnitudeRaw);

      if (magnitude < this.deadZone) {
        this.onMove({ dx: 0, dy: 0, magnitude: 0, angle });
        return;
      }

      // Vector hướng chuẩn hoá (-1..1), nhân theo magnitude để giữ cảm giác "kéo nhẹ = đi chậm"
      const normDx = Math.cos(angle) * magnitude;
      const normDy = Math.sin(angle) * magnitude;
      this.onMove({ dx: normDx, dy: normDy, magnitude, angle });
    }

    _handlePointerUp(evt) {
      if (!this.active || evt.pointerId !== this.activePointerId) return;
      this.active = false;
      this.activePointerId = null;
      this.baseEl.style.display = 'none';
      this.onEnd();
    }

    _setKnobOffset(x, y) {
      this.knobEl.style.transform = `translate(${x}px, ${y}px)`;
    }

    /** Gỡ toàn bộ event listener — gọi khi rời màn chơi để tránh leak. */
    destroy() {
      this.container.removeEventListener('pointerdown', this._onPointerDown);
      window.removeEventListener('pointermove', this._onPointerMove);
      window.removeEventListener('pointerup', this._onPointerUp);
      window.removeEventListener('pointercancel', this._onPointerUp);
      if (this.baseEl && this.baseEl.parentNode) {
        this.baseEl.parentNode.removeChild(this.baseEl);
      }
    }
  }

  return BattleJoystick;
});
