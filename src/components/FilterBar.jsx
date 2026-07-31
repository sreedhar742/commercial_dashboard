import { useState } from "react";
import { FilterIcon } from "./Icons.jsx";

// Filter bar matching the API's query params:
// school_code, teacher_username, date (exact), start_date, end_date, page_size.
const EMPTY = {
  exam_id: "",
  school_code: "",
  teacher_username: "",
  date: "",
  start_date: "",
  end_date: "",
  page_size: "20",
};

export default function FilterBar({ onApply, loading }) {
  const [values, setValues] = useState(EMPTY);

  function update(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onApply(values);
  }

  function handleReset() {
    setValues(EMPTY);
    onApply(EMPTY);
  }

  return (
    <form className="filter-bar" onSubmit={handleSubmit}>
      <div className="card-head" style={{ borderBottom: "1px solid var(--glass-hairline)" }}>
        <span className="head-icon">
          <FilterIcon size={17} />
        </span>
        <h3>Filters</h3>
      </div>

      <div className="filter-body">
        <div className="filter-grid">
          <label className="field">
            <span>School code</span>
            <input
              type="text"
              placeholder="e.g. TST01"
              value={values.school_code}
              onChange={(e) => update("school_code", e.target.value)}
            />
          </label>

          <label className="field">
            <span>Teacher username</span>
            <input
              type="text"
              placeholder="Username"
              value={values.teacher_username}
              onChange={(e) => update("teacher_username", e.target.value)}
            />
          </label>

          <label className="field">
            <span>Exam ID</span>
            <input
              type="text"
              placeholder="e.g. 101"
              value={values.exam_id}
              onChange={(e) => update("exam_id", e.target.value)}
            />
          </label>

          <label className="field">
            <span>Exact date</span>
            <input
              type="date"
              value={values.date}
              onChange={(e) => update("date", e.target.value)}
            />
          </label>

          <label className="field">
            <span>Start date</span>
            <input
              type="date"
              value={values.start_date}
              onChange={(e) => update("start_date", e.target.value)}
            />
          </label>

          <label className="field">
            <span>End date</span>
            <input
              type="date"
              value={values.end_date}
              onChange={(e) => update("end_date", e.target.value)}
            />
          </label>

          <label className="field">
            <span>Page size</span>
            <select
              value={values.page_size}
              onChange={(e) => update("page_size", e.target.value)}
            >
              <option value="20">20 rows</option>
              <option value="50">50 rows</option>
              <option value="100">100 rows</option>
            </select>
          </label>
        </div>
      </div>

      <div className="filter-actions">
        <span className="spacer" />
        <button
          className="btn btn-ghost"
          type="button"
          onClick={handleReset}
          disabled={loading}
        >
          Reset
        </button>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Loading…" : "Apply filters"}
        </button>
      </div>
    </form>
  );
}
