import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import Spinner from './components/Spinner/Spinner';
import axios from "axios";

function App() {
  const [launches, setLaunches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [expandedLaunches, setExpandedLaunches] = useState([]);
  const observer = useRef();

  const fetchLaunches = useCallback(async () => {
    if (!hasMore) return;
    setLoading(true);
    try {
      const response = await axios.get(
        `https://api.spacexdata.com/v3/launches?limit=10&offset=${(page - 1) * 10}`
      );
      if (response.data.length === 0) setHasMore(false);
      const uniqueLaunches = Array.from(new Set(response.data.map(launch => launch.mission_name)))
        .map(mission_name => {
          return response.data.find(launch => launch.mission_name === mission_name);
        });
      setLaunches((prev) => (page === 1 ? uniqueLaunches : [...prev, ...uniqueLaunches]));
    } catch (error) {
      console.error("Error fetching launches:", error);
    }
    setLoading(false);
  }, [hasMore, page]);

  const searchLaunches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `https://api.spacexdata.com/v3/launches?limit=1000`
      );
      const filteredData = response.data.filter((launch) =>
        launch.mission_name.toLowerCase().includes(search.toLowerCase())
      );
      const uniqueLaunches = Array.from(new Set(filteredData.map(launch => launch.mission_name)))
        .map(mission_name => {
          return filteredData.find(launch => launch.mission_name === mission_name);
        });
      setLaunches(uniqueLaunches);
      setHasMore(false);
      setExpandedLaunches([]); // Reset expanded launches on search
    } catch (error) {
      console.error("Error searching launches:", error);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchLaunches();
  }, [page, fetchLaunches]);

  useEffect(() => {
    if (search) {
      searchLaunches();
    } else {
      fetchLaunches();
    }
  }, [search, fetchLaunches, searchLaunches]);

  const lastLaunchRef = (node) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        setPage((prev) => prev + 1);
      }
    });
    if (node) observer.current.observe(node);
  };

  const getStatusTag = (launch) => {
    if (!launch.upcoming) {
      return launch.launch_success ? "Success" : "Failed";
    }
    return "Upcoming";
  };

  const formatLaunchTime = (date) => {
    const now = new Date();
    const launchDate = new Date(date);
    const diffInMs = now - launchDate;
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInYears = Math.floor(diffInDays / 365);

    if (diffInYears > 0) {
      return `${diffInYears} years ago`;
    } else if (diffInDays > 0) {
      return `${diffInDays} days ago`;
    } else {
      return `${diffInHours} hours ago`;
    }
  };

  const toggleLaunchDetails = (launchDateUnix) => {
    setExpandedLaunches((prev) =>
      prev.includes(launchDateUnix)
        ? prev.filter((date) => date !== launchDateUnix)
        : [...prev, launchDateUnix]
    );
  };

  return (
    <div className="App">
      <head>
        <title>SpaceX Launches - Infinite Scroll & Search</title>
        <meta name="description" content="Browse SpaceX launches with infinite scrolling and search functionality." />
        <meta name="keywords" content="SpaceX, launches, rockets, space, infinite scroll, search" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <div className="container">
        <h1 className="title">SpaceX Launches</h1>
        <input
          type="text"
          placeholder="Search launches..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
            setHasMore(true);
          }}
          className="search-box"
          aria-label="Search SpaceX Launches"
        />
        <div className="launch-list">
          {launches.map((launch, index) => (
            <div
              key={launch.launch_date_unix}
              ref={index === launches.length - 1 ? lastLaunchRef : null}
              className="launch-item"
            >
              <div className='launch-header'>
                <h1 className="mission-name">
                  {launch.mission_name}
                </h1>
                <span className={`status-tag ${getStatusTag(launch).toLowerCase()}`}>
                  {getStatusTag(launch)}
                </span>
              </div>
              {expandedLaunches.includes(launch.launch_date_unix) && (
                <div className="launch-details">
                  <div className="launch-meta">
                    <p className="launch-date">{formatLaunchTime(launch.launch_date_utc)}</p>
                    {launch.links.video_link && (
                      <a href={launch.links.article_link} target="_blank" rel="noopener noreferrer" className='video-link'>
                        | article
                      </a>
                    )}
                    {launch.links.video_link && (
                      <a href={launch.links.video_link} target="_blank" rel="noopener noreferrer" className='video-link'>
                        | video
                      </a>
                    )}
                  </div>
                  <div className="launch-info">
                    {launch.links.mission_patch ? (
                      <img src={launch.links.mission_patch} alt={launch.mission_name} className="mission-image" loading="lazy" />
                    ) : (
                      "No image yet."
                    )}
                    <p>{launch.details || "No details yet."}</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => toggleLaunchDetails(launch.launch_date_unix)}
                className="view-button view-button--primary">
                {expandedLaunches.includes(launch.launch_date_unix) ? "Hide" : "View"}
              </button>
            </div>
          ))}
        </div>
        {loading && <Spinner />}
        {!hasMore && !loading && <p className="loading">End of list.</p>}
      </div>
    </div>
  );
}

export default App;
