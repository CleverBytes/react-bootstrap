import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { useImperativeHandle } from 'react';
import { render } from '@testing-library/react';
import { Offset } from '@restart/ui/usePopper';
import Popover from '../src/Popover';
import Tooltip from '../src/Tooltip';
import useOverlayOffset from '../src/useOverlayOffset';

describe('useOverlayOffset', () => {
  const Wrapper = React.forwardRef<
    any,
    React.PropsWithChildren<{ customOffset?: Offset }>
  >((props, outerRef) => {
    const [ref, modifiers] = useOverlayOffset(props.customOffset);

    useImperativeHandle(outerRef, () => ({
      modifiers,
    }));

    return React.cloneElement(props.children as React.ReactElement<any>, {
      ref,
    });
  });

  it('should have offset of [0, 8] for Popovers', () => {
    const ref = React.createRef<any>();

    render(
      <Wrapper ref={ref}>
        <Popover id="test-popover" />
      </Wrapper>,
    );

    const offset = ref.current.modifiers[0].options.offset();
    expect(offset).toEqual([0, 8]);
  });

  it('should apply custom offset', () => {
    const ref = React.createRef<any>();

    render(
      <Wrapper ref={ref} customOffset={[200, 200]}>
        <Popover id="test-popover" />
      </Wrapper>,
    );

    const offset = ref.current.modifiers[0].options.offset();
    expect(offset).toEqual([200, 200]);
  });

  it('should have offset of [0, 6] for Tooltips', () => {
    const ref = React.createRef<any>();

    render(
      <Wrapper ref={ref}>
        <Tooltip id="test-tooltip" />
      </Wrapper>,
    );

    const offset = ref.current.modifiers[0].options.offset();
    expect(offset).toEqual([0, 6]);
  });

  it('should have offset of [0, 0] for any overlay', () => {
    const ref = React.createRef<any>();

    render(
      <Wrapper ref={ref}>
        <div>test</div>
      </Wrapper>,
    );

    const offset = ref.current.modifiers[0].options.offset();
    expect(offset).toEqual([0, 0]);
  });
});
