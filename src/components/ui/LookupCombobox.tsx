import React, { useEffect, useId, useRef, useState } from 'react';
import { useI18n } from '../../app/i18n';
import { Input } from './Input';
import { clsx } from './clsx';

export interface LookupOption<T> {
  value: T;
  id: number;
  title: string;
  detail?: string;
}

/** Shared user/node activation contract: commit on click, never on press. */
export function LookupCombobox<T>(props: {
  value: string;
  onChange: (value: string) => void;
  onPick: (value: T) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showSuggestions: boolean;
  options: LookupOption<T>[];
  busy: boolean;
  failed: boolean;
  placeholder?: string;
  disabled?: boolean;
  testId?: string;
  ariaLabel?: string;
  label?: React.ReactNode;
  className?: string;
  loadingLabel?: string;
  noResultsLabel?: string;
}) {
  const { t } = useI18n();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [active, setActive] = useState(-1);
  const expanded = props.open && props.showSuggestions && !props.disabled;
  const options = props.options;

  useEffect(() => {
    setActive(options.length ? 0 : -1);
  }, [options]);
  useEffect(() => () => clearTimeout(blurTimer.current), []);
  useEffect(() => {
    if (expanded)
      list.current
        ?.querySelector<HTMLElement>(`[data-option-index="${active}"]`)
        ?.scrollIntoView?.({ block: 'nearest' });
  }, [active, expanded]);

  function close() {
    props.onOpenChange(false);
    setActive(-1);
  }
  function pick(option: LookupOption<T>) {
    clearTimeout(blurTimer.current);
    input.current?.focus({ preventScroll: true });
    props.onPick(option.value);
    close();
  }
  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === 'Escape' && expanded) {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      props.onOpenChange(true);
      setActive((previous) =>
        options.length
          ? previous < 0
            ? event.key === 'ArrowDown'
              ? 0
              : options.length - 1
            : (previous + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
          : -1
      );
    } else if (event.key === 'Enter' && expanded && options[active]) {
      event.preventDefault();
      pick(options[active]);
    }
  }
  const status = props.busy
    ? props.loadingLabel || t('common.loading')
    : props.failed
      ? t('common.error')
      : props.noResultsLabel || t('common.no_results');
  return (
    <div ref={wrapper} className={clsx('relative min-w-0', props.className)}>
      <Input
        ref={input}
        value={props.value}
        onChange={(event) => {
          props.onChange(event.target.value);
          props.onOpenChange(true);
          setActive(-1);
        }}
        onFocus={() => {
          clearTimeout(blurTimer.current);
          props.onOpenChange(true);
        }}
        onBlur={(event) => {
          if (event.relatedTarget instanceof Node && wrapper.current?.contains(event.relatedTarget)) return;
          clearTimeout(blurTimer.current);
          blurTimer.current = setTimeout(() => {
            if (!wrapper.current?.contains(document.activeElement)) close();
          }, 0);
        }}
        onKeyDown={onKeyDown}
        placeholder={props.placeholder}
        disabled={props.disabled}
        testId={props.testId}
        ariaLabel={props.ariaLabel}
        label={props.label}
        autoComplete="off"
        role="combobox"
        ariaAutocomplete="list"
        ariaExpanded={expanded}
        ariaControls={expanded ? listId : undefined}
        ariaActiveDescendant={expanded && options[active] ? `${listId}-${options[active].id}` : undefined}
      />
      {expanded ? (
        <div
          className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto overscroll-contain rounded-md border border-border bg-overlay-surface shadow-panel"
          data-testid={props.testId ? `${props.testId}.dropdown` : undefined}
          data-overlay="popover"
          data-overlay-surface="overlay"
        >
          {props.busy || props.failed || options.length === 0 ? (
            <div role="status" className="px-3 py-2 text-sm text-muted">
              {status}
            </div>
          ) : null}
          <ul id={listId} ref={list} role="listbox" aria-label={props.ariaLabel ?? props.placeholder} className="py-1">
            {options.map((option, index) => (
              <li key={option.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  tabIndex={-1}
                  id={`${listId}-${option.id}`}
                  aria-selected={index === active}
                  className={clsx(
                    'flex min-h-11 w-full items-start justify-between gap-3 px-3 py-2 text-left',
                    index === active ? 'bg-surface-2' : 'hover:bg-surface-2'
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(option)}
                  onMouseEnter={() => setActive(index)}
                  data-option-index={index}
                  data-testid={props.testId ? `${props.testId}.opt.${option.id}` : undefined}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-fg">{option.title}</div>
                    {option.detail ? <div className="mt-0.5 truncate text-xs text-muted">{option.detail}</div> : null}
                  </div>
                  <div className="shrink-0 text-xs tabular-nums text-faint">#{option.id}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
