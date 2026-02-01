import type { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import type { BusStop } from '../api/types';

const ROW_HEIGHT_REM = 2.5;

export interface SearchbarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  results: BusStop[];
  onSelectStop: (stop: BusStop) => void;
  /** Max number of results visible without scrolling; when there are more, results are shown in a scrollable list. */
  maxVisibleResults: number;
  noResultsMessage: string;
  /** When true, show results panel even when query is empty (e.g. saved stops list). */
  showResultsWhenEmpty?: boolean;
  /** When true, results are in normal flow (e.g. inside another dropdown). When false, results are absolutely positioned. */
  inlineResults?: boolean;
  stopPropagation?: boolean;
  /** Optional content at the start of each row (e.g. saved bookmark icon). */
  renderItemPrefix?: (stop: BusStop) => ReactNode;
  /** Optional extra content per row (e.g. remove button). */
  renderItemExtra?: (stop: BusStop) => ReactNode;
  /** Class name for the wrapper (e.g. "relative max-w-xs flex-1"). */
  className?: string;
  /** Class name for the search bar wrapper (only when not showResultsWhenEmpty). */
  searchBarClassName?: string;
}

export default function Searchbar({
  value,
  onChange,
  placeholder,
  results,
  onSelectStop,
  maxVisibleResults,
  noResultsMessage,
  showResultsWhenEmpty = false,
  inlineResults = false,
  stopPropagation = false,
  renderItemPrefix,
  renderItemExtra,
  className = '',
  searchBarClassName = '',
}: SearchbarProps) {
  const showDropdown = showResultsWhenEmpty || value.trim() !== '';
  const useScroll = results.length > maxVisibleResults;
  const scrollHeightRem = maxVisibleResults * ROW_HEIGHT_REM;

  return (
    <div className={inlineResults ? className.trim() : `relative ${className}`.trim()}>
      <div
        className={`relative flex items-center ${searchBarClassName}`.trim()}
        onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
        onKeyDown={stopPropagation ? (e) => e.stopPropagation() : undefined}
      >
        <Search
          className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none"
          aria-hidden
        />
        <input
          type="text"
          inputMode="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-8 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
        {value.trim() !== '' && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 h-7 w-7 shrink-0"
            onClick={(e) => {
              if (stopPropagation) e.stopPropagation();
              onChange('');
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {showDropdown && (
        <div
          className={
            inlineResults
              ? 'mt-1 rounded-md border border-border bg-background'
              : 'absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-border bg-background shadow-lg'
          }
          style={useScroll ? { maxHeight: `min(${scrollHeightRem}rem, 50vh)`, overflow: 'hidden' } : undefined}
        >
          {results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {noResultsMessage}
            </div>
          ) : useScroll ? (
            <ScrollArea
              style={{ height: `min(${scrollHeightRem}rem, 50vh)` }}
            >
              <div className="p-1">
                {results.map((stop) => (
                  <div
                    key={stop.id}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectStop(stop)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectStop(stop);
                      }
                    }}
                  >
                    {renderItemPrefix?.(stop)}
                    <span className="min-w-0 flex-1 truncate">{stop.name}</span>
                    <span className="shrink-0 text-muted-foreground text-xs">
                      {stop.id}
                    </span>
                    {renderItemExtra?.(stop)}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="p-1">
              {results.map((stop) => (
                <div
                  key={stop.id}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectStop(stop)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectStop(stop);
                    }
                  }}
                >
                  {renderItemPrefix?.(stop)}
                  <span className="min-w-0 flex-1 truncate">{stop.name}</span>
                  <span className="shrink-0 text-muted-foreground text-xs">
                    {stop.id}
                  </span>
                  {renderItemExtra?.(stop)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
