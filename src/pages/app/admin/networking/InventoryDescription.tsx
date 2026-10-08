import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function InventoryDescription(props: {
  label: React.ReactNode;
  description: string;
  id: string;
  rowNoNav?: boolean;
}) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const open = hovered || focused;

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!open || !trigger || !tooltip) return;

    function position() {
      if (!trigger || !tooltip) return;
      const anchor = trigger.getBoundingClientRect();
      let left = Math.max(0, anchor.left);
      let right = Math.min(window.innerWidth, anchor.right);
      let top = Math.max(0, anchor.top);
      let bottom = Math.min(window.innerHeight, anchor.bottom);
      for (let parent = trigger.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        const bounds = parent.getBoundingClientRect();
        if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX)) {
          left = Math.max(left, bounds.left + parent.clientLeft);
          right = Math.min(right, bounds.left + parent.clientLeft + parent.clientWidth);
        }
        if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowY)) {
          top = Math.max(top, bounds.top + parent.clientTop);
          bottom = Math.min(bottom, bounds.top + parent.clientTop + parent.clientHeight);
        }
      }
      tooltip.hidden = right <= left || bottom <= top
        || ['hidden', 'collapse'].includes(getComputedStyle(trigger).visibility);
      if (tooltip.hidden) return;

      const margin = 12;
      tooltip.style.width = `${Math.min(288, Math.max(1, window.innerWidth - margin * 2))}px`;
      tooltip.style.maxHeight = `${Math.max(1, window.innerHeight - margin * 2)}px`;
      const popup = tooltip.getBoundingClientRect();
      const below = anchor.bottom + 8;
      const popupTop = below + popup.height <= window.innerHeight - margin
        ? below : anchor.top - popup.height - 8;
      tooltip.style.left = `${Math.max(margin, Math.min(anchor.left, window.innerWidth - popup.width - margin))}px`;
      tooltip.style.top = `${Math.max(margin, Math.min(popupTop, window.innerHeight - popup.height - margin))}px`;
    }

    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [open, props.description]);

  return (
    <>
      <span ref={triggerRef} tabIndex={0} title={props.description} aria-describedby={props.id}
        data-row-no-nav={props.rowNoNav || undefined} className="inline-flex cursor-help"
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
        {props.label}
      </span>
      {/* Both inventory tables and editor cards can clip an inline description. */}
      {createPortal(
        <div ref={tooltipRef} id={props.id} role="tooltip" hidden={!open} className="pointer-events-none fixed z-[60] overflow-y-auto whitespace-normal rounded-md border border-border bg-surface p-2 text-left text-xs font-normal text-fg shadow-lg">
          {props.description}
        </div>,
        document.body,
      )}
    </>
  );
}
