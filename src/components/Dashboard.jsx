import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import {
  fetchExamCostSummary,
  fetchExamMetadata,
} from "../api/client.js";
import FilterBar from "./FilterBar.jsx";
import SummaryCards from "./SummaryCards.jsx";
import MetadataTable from "./MetadataTable.jsx";
import Pagination from "./Pagination.jsx";
import { LogoutIcon, AlertIcon } from "./Icons.jsx";

const EMPTY_TOTALS = {
  b1to10: 0,
  b11to20: 0,
  b21to30: 0,
  above30: 0,
  totalPrice: 0,
};

function requestErrorMessage(err, fallback) {
  if (err?.status === 403) {
    return "Only admin users can access exam correction metadata (403).";
  }
  return err?.message || fallback;
}

// Admin audit dashboard for the Exam Correction Metadata API.
export default function Dashboard() {
  const { username, logout } = useAuth();
  const requestIdRef = useRef(0);

  const [page, setPage] = useState(null); // { count, next, previous, page_size, results }
  const [filters, setFilters] = useState({ page_size: "20" });
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [pageError, setPageError] = useState(null);
  const [summaryError, setSummaryError] = useState(null);
  const [summary, setSummary] = useState({ count: 0, totals: EMPTY_TOTALS });

  const loadPageOnly = useCallback(async (paramsOrUrl) => {
    setLoading(true);
    setPageError(null);
    try {
      const data = await fetchExamMetadata(paramsOrUrl);
      setPage(data);
    } catch (err) {
      setPageError(requestErrorMessage(err, "Failed to load metadata."));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWithSummary = useCallback((values) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setSummaryLoading(true);
    setSummaryLoaded(false);
    setPageError(null);
    setSummaryError(null);

    fetchExamMetadata(values)
      .then((firstPage) => {
        if (requestIdRef.current === requestId) {
          setPage(firstPage);
        }
      })
      .catch((err) => {
        if (requestIdRef.current === requestId) {
          setPageError(requestErrorMessage(err, "Failed to load metadata."));
        }
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      });

    fetchExamCostSummary(values)
      .then((nextSummary) => {
        if (requestIdRef.current === requestId) {
          setSummary(nextSummary);
          setSummaryLoaded(true);
        }
      })
      .catch((err) => {
        if (requestIdRef.current === requestId) {
          setSummaryError(
            requestErrorMessage(err, "Failed to load cost summary.")
          );
        }
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setSummaryLoading(false);
        }
      });
  }, []);

  // Initial load.
  useEffect(() => {
    loadWithSummary(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApply(values) {
    setFilters(values);
    loadWithSummary(values);
  }

  const initials = (username || "?").slice(0, 2).toUpperCase();

  const results = page?.results || [];
  const examCount = summary.count;
  const pageSize = Number(page?.page_size) || Number(filters.page_size) || 20;

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="brand">
          <div>
            <div className="brand-title">Correction Console</div>
            <div className="brand-sub">Exam correction</div>
          </div>
        </div>
        <div className="topbar-right">
          {username && (
            <span className="user-chip">
              {username}
              <span className="user-avatar">{initials}</span>
            </span>
          )}
          <button className="btn btn-ghost icon-btn" onClick={logout} title="Sign out">
            <LogoutIcon size={17} />
          </button>
        </div>
      </header>

      <div className="page">
        <div className="page-head">
          <h1 className="page-title">Exam Correction</h1>
        </div>

        <main className="main">
          <SummaryCards
            count={examCount}
            hasData={summaryLoaded}
            loading={summaryLoading}
            totals={summary.totals}
          />

          <FilterBar onApply={handleApply} loading={loading} />

          {pageError && (
            <div className="alert alert-error">
              <AlertIcon size={18} />
              <span>{pageError}</span>
            </div>
          )}

          {summaryError && (
            <div className="alert alert-error">
              <AlertIcon size={18} />
              <span>{summaryError}</span>
            </div>
          )}

          <MetadataTable results={results} loading={loading} pageSize={pageSize} />

          {page && (
            <Pagination
              count={
                summaryLoaded
                  ? examCount
                  : Number(page.count || results.length)
              }
              pageSize={pageSize}
              next={page.next}
              previous={page.previous}
              onNavigate={(url) => url && loadPageOnly(url)}
              loading={loading}
            />
          )}
        </main>
      </div>
    </div>
  );
}
