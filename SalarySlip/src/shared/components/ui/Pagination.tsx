import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  /** Total number of items (after filtering) */
  totalItems: number;
  /** Current page (1-indexed) */
  currentPage: number;
  /** Items shown per page */
  pageSize: number;
  /** Available page-size options */
  pageSizeOptions?: number[];
  /** Fired when the user changes page */
  onPageChange: (page: number) => void;
  /** Fired when the user picks a different page size */
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  totalItems,
  currentPage,
  pageSize,
  pageSizeOptions = [10, 25, 50],
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  /** Build a compact list of page numbers with ellipsis gaps. */
  const pageNumbers = (() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  })();

  const BTN_BASE =
    "inline-flex items-center justify-center rounded-lg border text-[12.5px] font-semibold transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
  const BTN_PAGE = (active: boolean) =>
    `${BTN_BASE} min-w-[32px] h-[32px] ${
      active
        ? "bg-ink text-white border-ink shadow-sm"
        : "bg-white text-ash border-line hover:bg-slate-50 hover:text-ink"
    }`;
  const BTN_NAV = `${BTN_BASE} h-[32px] px-2 bg-white text-ash border-line hover:bg-slate-50 hover:text-ink`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 mt-2">
      {/* Left: page size selector + info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-mist font-medium">Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="h-[32px] rounded-lg border border-line bg-white px-2 pr-6 text-[12.5px] font-semibold text-ink cursor-pointer outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 6px center",
            }}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span className="text-[12px] text-mist font-medium">entries</span>
        </div>

        <span className="text-[12px] text-ash font-medium">
          {totalItems === 0
            ? "No records"
            : `${startItem}–${endItem} of ${totalItems}`}
        </span>
      </div>

      {/* Right: page navigation */}
      <div className="flex items-center gap-1">
        <button
          className={BTN_NAV}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
          <span className="text-[12px] font-medium">Prev</span>
        </button>

        {pageNumbers.map((p, i) =>
          p === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="inline-flex items-center justify-center min-w-[32px] h-[32px] text-[12px] text-mist select-none"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              className={BTN_PAGE(p === currentPage)}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          ),
        )}

        <button
          className={BTN_NAV}
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          <span className="text-[12px] font-medium">Next</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
