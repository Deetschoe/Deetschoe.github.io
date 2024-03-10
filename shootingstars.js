document.addEventListener('DOMContentLoaded', () => {
    const starfield = document.getElementById('starfield');
    let stars = [];
  
    function createStar() {
      const star = document.createElement('div');
      const size = Math.random() * 2.5 + 1.25; // Increased size by 25% and added variability
      const colorArray = ['#FFFFFF', '#ffff00']; // Bright blue, bright yellow, and blue colors
      const color = colorArray[Math.floor(Math.random() * colorArray.length)];
      
      star.style.position = 'absolute';
      star.style.left = `${Math.random() * window.innerWidth}px`;
      star.style.top = `-${size}px`;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.backgroundColor = color;
      star.style.boxShadow = `0 0 15px ${color}, 0 0 30px ${color}`; 
      star.style.zIndex = '1';
      star.style.borderRadius = '50%';
      
      starfield.appendChild(star);
  
      let xEnd = Math.random() * window.innerWidth;
      let yEnd = window.innerHeight + size;
      let duration = Math.random() * 3000 + 2000; // Last between 2 and 5 seconds
  
      const animation = star.animate([
        { transform: `translate(${xEnd - parseInt(star.style.left, 10)}px, ${yEnd}px)` }
      ], {
        duration: duration,
        easing: 'linear',
        fill: 'forwards'
      });
  
      stars.push({ star, size, xEnd, yEnd });
  
      animation.onfinish = () => {
        if (Math.random() < 0.1) {
          explodeStar(star, size);
        } else {
          star.remove();
        }
        stars = stars.filter(s => s.star !== star);
      };
    }
  
    function explodeStar(star, size) {
      for (let i = 0; i < 5; i++) {
        const piece = document.createElement('div');
        const pieceSize = size * 0.5;
        
        piece.style.position = 'absolute';
        piece.style.left = star.style.left;
        piece.style.top = star.style.top;
        piece.style.width = `${pieceSize}px`;
        piece.style.height = `${pieceSize}px`;
        piece.style.backgroundColor = star.style.backgroundColor;
        piece.style.boxShadow = star.style.boxShadow;
        piece.style.borderRadius = '50%';
        piece.style.zIndex = '2';
  
        starfield.appendChild(piece);
  
        let xMovement = Math.random() * 100 - 50;
        let yMovement = Math.random() * 100 - 50;
  
        piece.animate([
          { transform: `translate(${xMovement}px, ${yMovement}px) scale(0)` }
        ], {
          duration: 1000,
          easing: 'ease-out',
          fill: 'forwards'
        }).onfinish = () => piece.remove();
      }
      star.remove();
    }
  
    function randomStars() {
        let timeout = Math.random() * 8000 + 1000;
        createStar();
        setTimeout(randomStars, timeout);
      }
    
      randomStars();
    });

    document.addEventListener('DOMContentLoaded', function() {
        var links = [
            "https://www.youtube.com/watch?v=xXIxwV7bQTw",
            "https://www.instagram.com/p/C4TELxVAvAN/",
            "https://www.instagram.com/p/C3lWoLmgTGt/",
            "https://www.instagram.com/p/C3bP8WCAHPH/",
            "https://www.instagram.com/p/C3ANYY6L2R3/",
            "https://www.instagram.com/p/C2fnDcFgRUo/",
            "https://www.instagram.com/p/C2lgPgZgtS9/",
            "https://www.instagram.com/p/C1mbjvDAIbz/",
            "https://www.youtube.com/watch?v=XTUaXv9hVXE",
            "https://www.youtube.com/watch?v=hLCCbJw6Osg",
            "https://www.youtube.com/watch?v=3J1Rz-3N1WQ",
        ];
    
        document.getElementById('randomLink').addEventListener('click', function(event) {
            event.preventDefault(); // Prevent the default anchor behavior
            var randomIndex = Math.floor(Math.random() * links.length); // Get a random index
            var selectedURL = links[randomIndex]; // Select a random URL
            window.open(selectedURL, '_blank')(); // Open the selected URL in a new tab and focus on it
            window.location.href = selectedURL; // Navigate to the selected URL
        });
    });

    
    