// ============================================
// src/game/YouTubePlayer.jsx
// YouTube player with LOCKED controls
// Students CANNOT skip — no seek bar, no keyboard
// Custom play/pause button provided instead
// ============================================

import { useEffect, useRef, useState } from 'react';

const YouTubePlayer = ({ videoId, onVideoEnd }) => {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [watchedPercent, setWatchedPercent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    let destroyed = false;

    // Load YouTube IFrame API if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    const initPlayer = () => {
      // Guard: component may have unmounted while the script was loading
      if (destroyed || !containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,          // ⛔ HIDE all YouTube controls (no seek bar!)
          disablekb: 1,         // disable keyboard shortcuts
          fs: 0,                // disable fullscreen
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          playsinline: 1,
        },
        events: {
          onReady: () => setPlayerReady(true),
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.ENDED) {
              setVideoEnded(true);
              setWatchedPercent(100);
              setIsPlaying(false);
              clearInterval(intervalRef.current);
            }

            if (e.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              intervalRef.current = setInterval(() => {
                if (playerRef.current) {
                  const duration = playerRef.current.getDuration();
                  const current = playerRef.current.getCurrentTime();
                  if (duration > 0) {
                    const percent = Math.round((current / duration) * 100);

                    // Anti-skip: if jumped more than 3 seconds ahead, force back
                    const prevTime = playerRef.current._lastTime || 0;
                    if (current - prevTime > 3 && prevTime > 0) {
                      playerRef.current.seekTo(prevTime, true);
                      playerRef.current.playVideo();
                    } else {
                      playerRef.current._lastTime = current;
                      setWatchedPercent(percent);
                    }
                  }
                }
              }, 1000);
            }

            if (e.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              clearInterval(intervalRef.current);
              if (playerRef.current) {
                playerRef.current._lastTime = playerRef.current.getCurrentTime();
              }
            }
          },
        },
      });
    };

    // Wait for API to be ready.
    // FIX: Chain onto any existing callback instead of overwriting it —
    // multiple YouTubePlayer mounts (or a remount after modal close/reopen)
    // previously clobbered each other's initPlayer, leaving one player in a
    // permanently uninitialised state.
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        initPlayer();
      };
    }

    return () => {
      destroyed = true;
      clearInterval(intervalRef.current);
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (e) { }
      }
    };
  }, [videoId]);

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  return (
    <div style={styles.wrap}>
      <style>{`
        .play-btn:hover { transform: scale(1.1) !important; }
      `}</style>

      {/* YouTube player container — click-blocked overlay prevents seeking */}
      <div style={styles.playerBox}>
        <div ref={containerRef} style={styles.player} />
        {!playerReady && (
          <div style={styles.loading}>Loading video... 🎬</div>
        )}
      </div>

      {/* Custom play/pause button */}
      {playerReady && !videoEnded && (
        <button className="play-btn" style={styles.playBtn} onClick={handlePlayPause}>
          {isPlaying ? '⏸️ Pause' : '▶️ Play'}
        </button>
      )}

      {/* Progress bar (read-only, not interactive) */}
      <div style={styles.progressWrap}>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${watchedPercent}%` }} />
        </div>
        <span style={styles.progressText}>{watchedPercent}% watched</span>
      </div>

      {/* Status message */}
      {!videoEnded && (
        <div style={styles.warningBox}>
          🔒 Video controls are locked — you must watch the full video without skipping!
        </div>
      )}

      {/* Continue button — only shows when video ends */}
      {videoEnded ? (
        <button style={styles.continueBtn} onClick={onVideoEnd}>
          ✅ Video Complete! Continue →
        </button>
      ) : (
        <button style={styles.lockedBtn} disabled>
          🔒 Finish watching to continue...
        </button>
      )}
    </div>
  );
};

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  playerBox: { position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '10px', overflow: 'hidden' },
  player: { width: '100%', height: '100%' },
  loading: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem', background: '#000' },
  playBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', alignSelf: 'center', transition: 'transform 0.2s' },
  progressWrap: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  progressBar: { flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #2563eb, #16a34a)', borderRadius: '4px', transition: 'width 0.5s ease' },
  progressText: { fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap', fontWeight: '600' },
  warningBox: { background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center' },
  continueBtn: { width: '100%', padding: '0.85rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' },
  lockedBtn: { width: '100%', padding: '0.85rem', background: '#e2e8f0', color: '#94a3b8', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '600', cursor: 'not-allowed' },
};

export default YouTubePlayer;
