import React, { useState, useEffect, useRef, useCallback } from 'react';

const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const BIRD_SIZE = 20;
const PIPE_WIDTH = 80;
const PIPE_GAP = 150;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const PIPE_SPEED = 3;

function FlappyBird() {
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const [gameState, setGameState] = useState('waiting'); // 'waiting', 'playing', 'gameOver'
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => 
    parseInt(localStorage.getItem('flappyBirdHighScore')) || 0
  );

  const gameStateRef = useRef({
    bird: { x: 100, y: 300, velocity: 0 },
    pipes: [],
    score: 0,
    pipeTimer: 0
  });

  const resetGame = useCallback(() => {
    gameStateRef.current = {
      bird: { x: 100, y: 300, velocity: 0 },
      pipes: [],
      score: 0,
      pipeTimer: 0
    };
    setScore(0);
  }, []);

  const jump = useCallback(() => {
    if (gameState === 'waiting') {
      setGameState('playing');
    }
    if (gameState !== 'gameOver') {
      gameStateRef.current.bird.velocity = JUMP_FORCE;
    }
  }, [gameState]);

  const startNewGame = useCallback(() => {
    resetGame();
    setGameState('waiting');
  }, [resetGame]);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const state = gameStateRef.current;

    // Clear canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (gameState === 'playing') {
      // Update bird physics
      state.bird.velocity += GRAVITY;
      state.bird.y += state.bird.velocity;

      // Generate pipes
      state.pipeTimer++;
      if (state.pipeTimer > 90) {
        const pipeHeight = Math.random() * (GAME_HEIGHT - PIPE_GAP - 100) + 50;
        state.pipes.push({
          x: GAME_WIDTH,
          topHeight: pipeHeight,
          bottomY: pipeHeight + PIPE_GAP,
          passed: false
        });
        state.pipeTimer = 0;
      }

      // Update pipes
      state.pipes = state.pipes.filter(pipe => {
        pipe.x -= PIPE_SPEED;
        
        // Check if bird passed pipe for scoring
        if (!pipe.passed && pipe.x + PIPE_WIDTH < state.bird.x) {
          pipe.passed = true;
          state.score++;
          setScore(state.score);
        }
        
        return pipe.x > -PIPE_WIDTH;
      });

      // Collision detection
      const birdLeft = state.bird.x;
      const birdRight = state.bird.x + BIRD_SIZE;
      const birdTop = state.bird.y;
      const birdBottom = state.bird.y + BIRD_SIZE;

      // Check ground and ceiling collision
      if (birdTop <= 0 || birdBottom >= GAME_HEIGHT) {
        setGameState('gameOver');
        if (state.score > highScore) {
          setHighScore(state.score);
          localStorage.setItem('flappyBirdHighScore', state.score.toString());
        }
      }

      // Check pipe collision
      for (const pipe of state.pipes) {
        if (birdRight > pipe.x && birdLeft < pipe.x + PIPE_WIDTH) {
          if (birdTop < pipe.topHeight || birdBottom > pipe.bottomY) {
            setGameState('gameOver');
            if (state.score > highScore) {
              setHighScore(state.score);
              localStorage.setItem('flappyBirdHighScore', state.score.toString());
            }
          }
        }
      }
    }

    // Draw pipes
    ctx.fillStyle = '#228B22';
    state.pipes.forEach(pipe => {
      // Top pipe
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      // Bottom pipe
      ctx.fillRect(pipe.x, pipe.bottomY, PIPE_WIDTH, GAME_HEIGHT - pipe.bottomY);
    });

    // Draw bird
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(state.bird.x, state.bird.y, BIRD_SIZE, BIRD_SIZE);

    // Draw score
    ctx.fillStyle = '#000';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${state.score}`, 10, 30);

    if (gameState === 'waiting') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.fillStyle = '#FFF';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Click or Press Space to Start', GAME_WIDTH / 2, GAME_HEIGHT / 2);
      ctx.textAlign = 'left';
    }

    if (gameState === 'gameOver') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.fillStyle = '#FFF';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over!', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);
      ctx.fillText(`Score: ${state.score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2);
      ctx.fillText(`High Score: ${highScore}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40);
      ctx.fillText('Click to Restart', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80);
      ctx.textAlign = 'left';
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, highScore]);

  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameLoop]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'gameOver') {
          startNewGame();
        } else {
          jump();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, jump, startNewGame]);

  const handleCanvasClick = () => {
    if (gameState === 'gameOver') {
      startNewGame();
    } else {
      jump();
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: '1rem' 
    }}>
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        onClick={handleCanvasClick}
        style={{
          border: '2px solid var(--border)',
          borderRadius: '8px',
          cursor: 'pointer',
          background: '#87CEEB'
        }}
      />
      <div style={{ 
        textAlign: 'center', 
        color: 'var(--muted)',
        fontSize: '0.875rem'
      }}>
        <p>Click or press SPACE to play</p>
        <p>High Score: {highScore}</p>
      </div>
    </div>
  );
}

export default FlappyBird;