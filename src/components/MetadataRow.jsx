import { useState } from "react";
import { formatNumber, formatDate, formatInr } from "../utils/format.js";
import { ChevronIcon, ExternalIcon, UsersIcon } from "./Icons.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { fetchExamStudentDetails } from "../api/client.js";

// Renders one exam metadata row plus an expandable detail panel showing the
// per-student result files.

// `answer_sheets_snapshot` is stored verbatim, so its shape varies: it may be an
// array of file objects, a single object, or something else entirely. Normalise
// to an array so rendering never throws, and fall back to raw JSON for anything
// we don't recognise (so no data is silently lost).
function normalizeSnapshot(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

// Per-student page pricing (INR): a student is bucketed by their total pages
// (summed across their files), and each bucket carries a flat correction price.
const PRICE_1_TO_10 = 5;
const PRICE_11_TO_20 = 10;
const PRICE_21_TO_30 = 15;
const PRICE_ABOVE_30 = 20;

// Compute page/pricing stats for one exam from student_results_details:
//  - totalPages: sum of pages across every student/file (null if no page data)
//  - b1to10 / b11to20 / b21to30 / above30: number of students in each page bucket
//  - totalPrice: INR total across students by bucket
export function pageStats(item) {
  const empty = {
    totalPages: null,
    b1to10: 0,
    b11to20: 0,
    b21to30: 0,
    above30: 0,
    totalPrice: 0,
    hasData: false,
  };
  const backendStats = item?.page_stats;
  if (backendStats && typeof backendStats === "object") {
    return {
      totalPages:
        backendStats.total_pages === null ||
        backendStats.total_pages === undefined
          ? null
          : Number(backendStats.total_pages),
      b1to10: Number(backendStats.students_1_to_10 || 0),
      b11to20: Number(backendStats.students_11_to_20 || 0),
      b21to30: Number(backendStats.students_21_to_30 || 0),
      above30: Number(backendStats.students_above_30 || 0),
      totalPrice: Number(backendStats.total_price || 0),
      hasData: Boolean(backendStats.has_data),
    };
  }

  const details = item?.student_results_details;
  if (!details || typeof details !== "object") return empty;

  let totalPages = 0;
  let b1to10 = 0;
  let b11to20 = 0;
  let b21to30 = 0;
  let above30 = 0;
  let totalPrice = 0;
  let hasData = false;

  for (const files of Object.values(details)) {
    let studentPages = 0;
    let studentHasPages = false;
    for (const entry of normalizeSnapshot(files)) {
      const pages = entry && typeof entry === "object" ? Number(entry.pages) : NaN;
      if (Number.isFinite(pages)) {
        studentPages += pages;
        studentHasPages = true;
      }
    }
    if (!studentHasPages) continue;

    hasData = true;
    totalPages += studentPages;
    if (studentPages <= 10) {
      b1to10 += 1;
      totalPrice += PRICE_1_TO_10;
    } else if (studentPages <= 20) {
      b11to20 += 1;
      totalPrice += PRICE_11_TO_20;
    } else if (studentPages <= 30) {
      b21to30 += 1;
      totalPrice += PRICE_21_TO_30;
    } else {
      above30 += 1;
      totalPrice += PRICE_ABOVE_30;
    }
  }

  return hasData
    ? { totalPages, b1to10, b11to20, b21to30, above30, totalPrice, hasData }
    : empty;
}

// A student-bucket count cell. A lone number ("2") is ambiguous, so we prefix a
// people icon and add a tooltip ("2 students") to make it clear the count is
// students. Zero is shown muted without the icon to keep the table calm.
function BucketCount({ value }) {
  if (!value) return <span className="badge-zero">0</span>;
  const label = `${formatNumber(value)} student${value === 1 ? "" : "s"}`;
  return (
    <span className="student-count" title={label}>
      <UsersIcon size={13} />
      {formatNumber(value)}
    </span>
  );
}

function FileEntry({ entry }) {
  const isObj = entry && typeof entry === "object" && !Array.isArray(entry);
  const hasLinks = isObj && (entry.file_url || entry.report_url);

  if (hasLinks) {
    return (
      <li>
        {entry.file_url && (
          <a className="file-link" href={entry.file_url} target="_blank" rel="noreferrer">
            <ExternalIcon /> Answer sheet
          </a>
        )}
        {entry.report_url && (
          <a className="file-link" href={entry.report_url} target="_blank" rel="noreferrer">
            <ExternalIcon /> Report
          </a>
        )}
        {entry.pages != null && <span className="muted">{entry.pages} pages</span>}
      </li>
    );
  }

  // Unknown shape - show it as readable JSON rather than crashing.
  const text =
    entry && typeof entry === "object"
      ? JSON.stringify(entry, null, 2)
      : String(entry);
  return (
    <li>
      <pre className="snapshot-json">{text}</pre>
    </li>
  );
}

function StudentResults({ details }) {
  if (!details || typeof details !== "object" || Object.keys(details).length === 0) {
    return <p className="muted">No student result details.</p>;
  }
  return (
    <div className="student-results">
      {Object.entries(details).map(([username, files]) => {
        const entries = normalizeSnapshot(files);
        return (
          <div key={username} className="student-block">
            <div className="student-name">{username}</div>
            {entries.length === 0 ? (
              <span className="muted">No files.</span>
            ) : (
              <ul className="file-list">
                {entries.map((entry, i) => (
                  <FileEntry key={i} entry={entry} />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MetadataRow({ item, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const exam = item.exam || {};
  const stats = pageStats(item);

  async function loadDetails() {
    if (!exam.id || detailsLoading) return;

    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const nextDetails = await fetchExamStudentDetails(exam.id);
      setDetails(nextDetails);
    } catch (err) {
      setDetailsError(err.message || "Failed to load student result files.");
    } finally {
      setDetailsLoading(false);
    }
  }

  function toggleOpen() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && details === null && !detailsLoading) {
      loadDetails();
    }
  }

  return (
    <>
      <tr className={open ? "data-row open" : "data-row"}>
        <td className="col-expand">
          <button
            className="expand-btn"
            onClick={toggleOpen}
            aria-expanded={open}
            aria-label={open ? "Collapse row" : "Expand row"}
          >
            <ChevronIcon size={15} />
          </button>
        </td>
        <td>
          <div className="strong">{exam.name || "-"}</div>
          {exam.exam_type && <div className="sub">{exam.exam_type}</div>}
        </td>
        <td>
          {exam.teacher_fullname || exam.teacher_username || "-"}
          {exam.teacher_username && <div className="sub">@{exam.teacher_username}</div>}
        </td>
        <td>{exam.school_code || "-"}</td>
        <td>
          {exam.class_section || "-"}
          {exam.section ? ` - ${exam.section}` : ""}
        </td>
        <td>{formatDate(exam.processed_at)}</td>
        <td className="num">{formatNumber(item.evaluated_roll_count)}</td>
        <td className="num">
          {stats.totalPages == null ? (
            <span className="badge-zero">-</span>
          ) : (
            <span className="pages-value">{formatNumber(stats.totalPages)}</span>
          )}
        </td>
        <td className="num">
          {stats.hasData ? <BucketCount value={stats.b1to10} /> : <span className="badge-zero">-</span>}
        </td>
        <td className="num">
          {stats.hasData ? <BucketCount value={stats.b11to20} /> : <span className="badge-zero">-</span>}
        </td>
        <td className="num">
          {stats.hasData ? <BucketCount value={stats.b21to30} /> : <span className="badge-zero">-</span>}
        </td>
        <td className="num">
          {stats.hasData ? <BucketCount value={stats.above30} /> : <span className="badge-zero">-</span>}
        </td>
        <td className="num strong">
          {stats.hasData ? formatInr(stats.totalPrice) : <span className="badge-zero">-</span>}
        </td>
      </tr>

      {open && (
        <tr className="detail-row">
          <td colSpan={13}>
            <ErrorBoundary compact>
              <div className="detail-panel">
                <section className="detail-section">
                  <h4>Student result files</h4>
                  {detailsLoading && (
                    <p className="muted">Loading student result files...</p>
                  )}
                  {!detailsLoading && detailsError && (
                    <div className="alert alert-error">
                      <span>{detailsError}</span>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={loadDetails}
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  {!detailsLoading && !detailsError && details !== null && (
                    <StudentResults details={details} />
                  )}
                </section>
              </div>
            </ErrorBoundary>
          </td>
        </tr>
      )}
    </>
  );
}
