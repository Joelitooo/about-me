// Official React Flow jsdom shims: https://reactflow.dev/learn/advanced-use/testing

class ResizeObserver {
  callback: globalThis.ResizeObserverCallback;

  constructor(callback: globalThis.ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    const width = (target as HTMLElement).offsetWidth || 800;
    const height = (target as HTMLElement).offsetHeight || 600;
    const contentRect = {
      x: 0,
      y: 0,
      width,
      height,
      top: 0,
      left: 0,
      bottom: height,
      right: width,
      toJSON() {
        return {};
      },
    };
    const boxSize = [{ inlineSize: width, blockSize: height }];

    setTimeout(() => {
      this.callback(
        [
          {
            target,
            contentRect,
            borderBoxSize: boxSize,
            contentBoxSize: boxSize,
            devicePixelContentBoxSize: boxSize,
          } as globalThis.ResizeObserverEntry,
        ],
        this,
      );
    }, 0);
  }

  unobserve() {}

  disconnect() {}
}

class DOMMatrixReadOnly {
  m22: number;
  constructor(transform?: string) {
    const scale = transform?.match(/scale\(([1-9.])\)/)?.[1];
    this.m22 = scale !== undefined ? Number(scale) : 1;
  }
}

let init = false;

export function mockReactFlow(): void {
  if (init) return;
  init = true;

  globalThis.ResizeObserver = ResizeObserver;
  Object.defineProperty(globalThis, "DOMMatrixReadOnly", {
    configurable: true,
    value: DOMMatrixReadOnly,
  });

  Object.defineProperties(globalThis.HTMLElement.prototype, {
    offsetHeight: {
      get() {
        return parseFloat(this.style.height) || 1;
      },
    },
    offsetWidth: {
      get() {
        return parseFloat(this.style.width) || 1;
      },
    },
  });

  Object.defineProperty(globalThis.SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => ({ x: 0, y: 0, width: 0, height: 0 }),
  });
}
