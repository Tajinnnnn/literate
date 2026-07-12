import React, { useCallback, useEffect, useState } from 'react';
import './Popup.css';
import { MSG } from '../../shared/messages';

const MIN_RATE = 0.1;
const MAX_RATE = 10;

function volumeIcon(volume) {
  if (volume <= 0) return '🔇';
  if (volume < 0.5) return '🔈';
  if (volume < 0.85) return '🔉';
  return '🔊';
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0]));
  });
}

function sendToActiveTab(message) {
  return getActiveTab().then(
    (tab) =>
      new Promise((resolve) => {
        if (!tab || !tab.id) {
          resolve(null);
          return;
        }
        chrome.tabs.sendMessage(tab.id, message, (response) => {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }
          resolve(response);
        });
      })
  );
}

const Popup = () => {
  const [state, setState] = useState(null);
  const [voices, setVoices] = useState([]);
  const [unavailable, setUnavailable] = useState(false);

  const [rateText, setRateText] = useState('1.0');
  const [editingRate, setEditingRate] = useState(false);
  const [volumeDraft, setVolumeDraft] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const refreshState = useCallback(() => {
    sendToActiveTab({ type: MSG.GET_STATE }).then((res) => {
      if (!res) {
        setUnavailable(true);
        return;
      }
      setUnavailable(false);
      setState(res);
    });
  }, []);

  useEffect(() => {
    refreshState();
    sendToActiveTab({ type: MSG.GET_VOICES }).then((res) => {
      if (res && res.voices) setVoices(res.voices);
    });
    const interval = setInterval(refreshState, 800);
    return () => clearInterval(interval);
  }, [refreshState]);

  useEffect(() => {
    if (!editingRate && state && typeof state.rate === 'number') {
      setRateText(state.rate.toFixed(1));
    }
  }, [state, editingRate]);

  const handleReadPage = () => sendToActiveTab({ type: MSG.READ_PAGE }).then(refreshState);
  const handleTogglePause = () => sendToActiveTab({ type: MSG.TOGGLE_PAUSE }).then(refreshState);
  const handleStop = () => sendToActiveTab({ type: MSG.STOP }).then(refreshState);
  const handleRate = (rate) => sendToActiveTab({ type: MSG.SET_RATE, rate }).then(refreshState);
  const handleVoice = (voiceURI) => sendToActiveTab({ type: MSG.SET_VOICE, voiceURI }).then(refreshState);
  const handleVolume = (volume) => sendToActiveTab({ type: MSG.SET_VOLUME, volume }).then(refreshState);
  const handleColor = (color) => sendToActiveTab({ type: MSG.SET_HIGHLIGHT_COLOR, color }).then(refreshState);
  const handleToggleDarkMode = () => sendToActiveTab({ type: MSG.TOGGLE_DARK_MODE }).then(refreshState);

  const stepRate = (delta) => {
    const current = state ? state.rate : 1;
    const next = Math.round(Math.min(MAX_RATE, Math.max(MIN_RATE, current + delta)) * 10) / 10;
    handleRate(next);
  };

  const commitRateText = (raw) => {
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed)) {
      handleRate(Math.round(Math.min(MAX_RATE, Math.max(MIN_RATE, parsed)) * 10) / 10);
    } else if (state) {
      setRateText(state.rate.toFixed(1));
    }
    setEditingRate(false);
  };

  if (unavailable) {
    return (
      <div className="tts-popup">
        <p className="tts-hint">
          This page can&apos;t be read aloud. Try a regular website (not a Chrome
          system page), then reopen this popup.
        </p>
      </div>
    );
  }

  const isActive = !!(state && state.active);
  const isPaused = !!(state && state.isPaused);
  const volume = volumeDraft !== null ? volumeDraft : (state && state.volume) ?? 1;
  const highlightColor = (state && state.highlightColor) || '#ffe58a';
  const darkMode = !!(state && state.darkMode);

  return (
    <div className="tts-popup">
      <div className="tts-header">
        <button
          className="tts-icon-toggle"
          onClick={() => setShowSettings((v) => !v)}
          title="Settings"
        >
          ⚙️
        </button>
        <button
          className="tts-icon-toggle"
          onClick={handleToggleDarkMode}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? '🌙' : '☀️'}
        </button>
      </div>

      <div className="tts-row">
        <button className="tts-btn primary" onClick={handleReadPage} title="Shortcut: O">
          Read Page
        </button>
      </div>

      <div className="tts-row">
        <button
          className="tts-btn"
          onClick={handleTogglePause}
          disabled={!isActive}
          title="Shortcut: P"
        >
          {isPaused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button className="tts-btn" onClick={handleStop} disabled={!isActive}>
          ■ Stop
        </button>
      </div>

      <div className="tts-section tts-controls-row">
        <div className="tts-stepper" title="Playback speed">
          <button className="tts-step-btn" onClick={() => stepRate(-0.1)}>
            −
          </button>
          <input
            className="tts-rate-input"
            type="text"
            inputMode="decimal"
            value={rateText}
            onFocus={() => setEditingRate(true)}
            onChange={(e) => {
              const v = e.target.value;
              if (/^\d*\.?\d*$/.test(v)) setRateText(v);
            }}
            onBlur={(e) => commitRateText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
          />
          <button className="tts-step-btn" onClick={() => stepRate(0.1)}>
            +
          </button>
        </div>

        <div className="tts-volume-control">
          <span className="tts-volume-icon" title="Volume">
            {volumeIcon(volume)}
          </span>
          <div className="tts-volume-popout">
            <input
              className="tts-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolumeDraft(parseFloat(e.target.value))}
              onMouseUp={(e) => {
                handleVolume(parseFloat(e.target.value));
                setVolumeDraft(null);
              }}
              onKeyUp={(e) => {
                handleVolume(parseFloat(e.target.value));
                setVolumeDraft(null);
              }}
            />
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="tts-section tts-settings">
          <div className="tts-controls-row">
            <input
              className="tts-color-input"
              type="color"
              title="Highlight color"
              value={highlightColor}
              onChange={(e) => handleColor(e.target.value)}
            />
            {voices.length > 0 && (
              <select
                className="tts-select"
                title="Voice"
                value={(state && state.voiceURI) || ''}
                onChange={(e) => handleVoice(e.target.value)}
              >
                <option value="">Default voice</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Popup;
