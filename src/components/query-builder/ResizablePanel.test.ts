import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import ResizablePanel from './ResizablePanel.vue';

const createRect = (width: number, height: number) =>
  ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect);

describe('ResizablePanel', () => {
  it('ドラッグでリサイズイベントを発火する', async () => {
    const wrapper = mount(ResizablePanel, {
      props: {
        direction: 'right',
        initialSize: 200,
      },
      slots: {
        default: '<div class="content">content</div>',
      },
    });

    const panelEl = wrapper.element as HTMLElement;
    const rectSpy = vi.spyOn(panelEl, 'getBoundingClientRect').mockReturnValue(
      createRect(200, 150)
    );

    const resizer = wrapper.get('.resizer-right');
    await resizer.trigger('mousedown', { clientX: 200, clientY: 0 });
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 280, clientY: 0 }));
    await nextTick();

    const emitted = wrapper.emitted('resize');
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]?.[0]).toBe(280);

    document.dispatchEvent(new MouseEvent('mouseup'));
    rectSpy.mockRestore();
    wrapper.unmount();
  });

  it('最小/最大サイズの制約を守る', async () => {
    const wrapper = mount(ResizablePanel, {
      props: {
        direction: 'right',
        initialSize: 200,
        minSize: 150,
        maxSize: 220,
      },
    });

    const panelEl = wrapper.element as HTMLElement;
    const rectSpy = vi.spyOn(panelEl, 'getBoundingClientRect').mockReturnValue(
      createRect(200, 120)
    );

    const resizer = wrapper.get('.resizer-right');
    await resizer.trigger('mousedown', { clientX: 200, clientY: 0 });

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 0 }));
    await nextTick();
    expect(wrapper.emitted('resize')?.[0]?.[0]).toBe(150);

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 500, clientY: 0 }));
    await nextTick();
    const last = wrapper.emitted('resize')?.pop()?.[0];
    expect(last).toBe(220);

    document.dispatchEvent(new MouseEvent('mouseup'));
    rectSpy.mockRestore();
    wrapper.unmount();
  });
});
