import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import BaseOverlay, {
  OverlayProps as BaseOverlayProps,
  OverlayArrowProps,
} from '@restart/ui/Overlay';
import { State } from '@restart/ui/usePopper';
import { componentOrElement, elementType } from 'prop-types-extra';
import useEventCallback from '@restart/hooks/useEventCallback';
import useIsomorphicEffect from '@restart/hooks/useIsomorphicEffect';
import useMergedRefs from '@restart/hooks/useMergedRefs';
import useOverlayOffset from './useOverlayOffset';
import Fade from './Fade';
import type { TransitionType } from './helpers';
import type { Placement, PopperRef, RootCloseEvent } from './types';

export interface OverlayInjectedProps {
  ref: React.RefCallback<HTMLElement>;
  style: React.CSSProperties;
  'aria-labelledby'?: string;

  arrowProps: Partial<OverlayArrowProps>;

  show: boolean;
  placement: Placement | undefined;
  popper: PopperRef;
  hasDoneInitialMeasure?: boolean;

  [prop: string]: any;
}

export type OverlayChildren =
  | React.ReactElement<OverlayInjectedProps>
  | ((injected: OverlayInjectedProps) => React.ReactNode);

export interface OverlayProps
  extends Omit<BaseOverlayProps, 'children' | 'transition' | 'rootCloseEvent'> {
  children: OverlayChildren;
  transition?: TransitionType;
  placement?: Placement;
  rootCloseEvent?: RootCloseEvent;
}

const propTypes = {
  /**
   * A component instance, DOM node, or function that returns either.
   * The `container` element will have the Overlay appended to it via a React portal.
   */
  container: PropTypes.oneOfType([componentOrElement, PropTypes.func]),

  /**
   * A component instance, DOM node, or function that returns either.
   * The overlay will be positioned in relation to the `target`
   */
  target: PropTypes.oneOfType([componentOrElement, PropTypes.func]),

  /**
   * Set the visibility of the Overlay
   */
  show: PropTypes.bool,

  /**
   * A set of popper options and props passed directly to Popper.
   */
  popperConfig: PropTypes.object,

  /**
   * Specify whether the overlay should trigger onHide when the user clicks outside the overlay
   */
  rootClose: PropTypes.bool,

  /**
   * Specify event for triggering a "root close" toggle.
   */
  rootCloseEvent: PropTypes.oneOf<RootCloseEvent>(['click', 'mousedown']),

  /**
   * A callback invoked by the overlay when it wishes to be hidden. Required if
   * `rootClose` is specified.
   */
  onHide: PropTypes.func,

  /**
   * Animate the entering and exiting of the Overlay. `true` will use the `<Fade>` transition,
   * or a custom react-transition-group `<Transition>` component can be provided.
   */
  transition: PropTypes.oneOfType([PropTypes.bool, elementType]),

  /**
   * Callback fired before the Overlay transitions in
   */
  onEnter: PropTypes.func,

  /**
   * Callback fired as the Overlay begins to transition in
   */
  onEntering: PropTypes.func,

  /**
   * Callback fired after the Overlay finishes transitioning in
   */
  onEntered: PropTypes.func,

  /**
   * Callback fired right before the Overlay transitions out
   */
  onExit: PropTypes.func,

  /**
   * Callback fired as the Overlay begins to transition out
   */
  onExiting: PropTypes.func,

  /**
   * Callback fired after the Overlay finishes transitioning out
   */
  onExited: PropTypes.func,

  /**
   * The placement of the Overlay in relation to it's `target`.
   */
  placement: PropTypes.oneOf<Placement>([
    'auto-start',
    'auto',
    'auto-end',
    'top-start',
    'top',
    'top-end',
    'right-start',
    'right',
    'right-end',
    'bottom-end',
    'bottom',
    'bottom-start',
    'left-end',
    'left',
    'left-start',
  ]),
};

function wrapRefs(props, arrowProps) {
  const { ref } = props;
  const { ref: aRef } = arrowProps;

  props.ref = ref.__wrapped || (ref.__wrapped = (r) => ref(r));
  arrowProps.ref = aRef.__wrapped || (aRef.__wrapped = (r) => aRef(r));
}

const Overlay = React.forwardRef<HTMLElement, OverlayProps>(
  (
    {
      children: overlay,
      transition = Fade,
      popperConfig = {},
      rootClose = false,
      placement = 'top',
      show: outerShow = false,
      ...outerProps
    },
    outerRef,
  ) => {
    const popperRef = useRef<Partial<PopperRef>>({});
    const [firstRenderedState, setFirstRenderedState] = useState<State | null>(
      null,
    );
    const [ref, modifiers] = useOverlayOffset(outerProps.offset);
    const mergedRef = useMergedRefs(outerRef as any, ref);

    const actualTransition =
      transition === true ? Fade : transition || undefined;

    const handleFirstUpdate = useEventCallback((state) => {
      setFirstRenderedState(state);
      popperConfig?.onFirstUpdate?.(state);
    });

    useIsomorphicEffect(() => {
      if (firstRenderedState && outerProps.target) {
        // Must wait for target element to resolve before updating popper.
        popperRef.current.scheduleUpdate?.();
      }
    }, [firstRenderedState, outerProps.target]);

    useEffect(() => {
      if (!outerShow) {
        setFirstRenderedState(null);
      }
    }, [outerShow]);

    return (
      <BaseOverlay
        {...outerProps}
        ref={mergedRef}
        popperConfig={{
          ...popperConfig,
          modifiers: modifiers.concat(popperConfig.modifiers || []),
          onFirstUpdate: handleFirstUpdate,
        }}
        transition={actualTransition}
        rootClose={rootClose}
        placement={placement}
        show={outerShow}
      >
        {(overlayProps, { arrowProps, popper: popperObj, show }) => {
          wrapRefs(overlayProps, arrowProps);
          // Need to get placement from popper object, handling case when overlay is flipped using 'flip' prop
          const updatedPlacement = popperObj?.placement;
          const popper = Object.assign(popperRef.current, {
            state: popperObj?.state,
            scheduleUpdate: popperObj?.update,
            placement: updatedPlacement,
            outOfBoundaries:
              popperObj?.state?.modifiersData.hide?.isReferenceHidden || false,
            strategy: popperConfig.strategy,
          });

          const hasDoneInitialMeasure = !!firstRenderedState;

          if (typeof overlay === 'function')
            return overlay({
              ...overlayProps,
              placement: updatedPlacement,
              show,
              ...(!transition && show && { className: 'show' }),
              popper,
              arrowProps,
              hasDoneInitialMeasure,
            });

          return React.cloneElement(overlay, {
            ...overlayProps,
            placement: updatedPlacement,
            arrowProps,
            popper,
            hasDoneInitialMeasure,
            className: classNames(
              overlay.props.className,
              !transition && show && 'show',
            ),
            style: {
              ...overlay.props.style,
              ...overlayProps.style,
            },
          });
        }}
      </BaseOverlay>
    );
  },
);

Overlay.displayName = 'Overlay';
Overlay.propTypes = propTypes;

export default Overlay;
