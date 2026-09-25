type Props = {
  page: number;
  pages: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  label: string;
  onPageChange: (page: number) => void;
};

export function Pagination({
  page,
  pages,
  total,
  rangeStart,
  rangeEnd,
  label,
  onPageChange,
}: Props) {
  if (total === 0) return null;

  const windowSize = 5;
  let start = Math.max(0, page - Math.floor(windowSize / 2));
  let end = Math.min(pages, start + windowSize);
  start = Math.max(0, end - windowSize);

  return (
    <div className="table-foot">
      <span>
        Showing {rangeStart}–{rangeEnd} of {total} {label}
      </span>
      <div className="pager">
        <button
          type="button"
          className="chip"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          ‹
        </button>
        {Array.from({ length: end - start }, (_, i) => {
          const index = start + i;
          return (
            <button
              key={index}
              type="button"
              className={`chip ${page === index ? "active" : ""}`}
              onClick={() => onPageChange(index)}
            >
              {index + 1}
            </button>
          );
        })}
        <button
          type="button"
          className="chip"
          disabled={page >= pages - 1}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
}
