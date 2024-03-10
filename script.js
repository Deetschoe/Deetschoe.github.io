function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

function createFloatingIcons(iconData) {
    console.log("Creating floating icons...");
    const container = document.querySelector('.icons-container');
    iconData.forEach(data => {
        const icon = document.createElement('img');
        icon.src = data.localPath;
        icon.classList.add("icon");
        icon.style.width = '3%';
        icon.style.opacity = '.2';
        icon.style.position = 'absolute';

        container.appendChild(icon);

        icon.onload = function() {
            icon.style.left = `${getRandom(0, window.innerWidth - icon.offsetWidth)}px`;
            icon.style.top = `${getRandom(0, window.innerHeight - icon.offsetHeight)}px`;

            let speedX = getRandom(0.5, 1.5) * (Math.random() < 0.5 ? -1 : 1);
            let speedY = getRandom(0.5, 1.5) * (Math.random() < 0.5 ? -1 : 1);

            setInterval(() => {
                const currentX = parseFloat(icon.style.left);
                const currentY = parseFloat(icon.style.top);

                let newX = currentX + speedX;
                let newY = currentY + speedY;

                if (newX <= 0 || newX + icon.offsetWidth >= window.innerWidth) {
                    speedX *= -1;
                }
                if (newY <= 0 || newY + icon.offsetHeight >= window.innerHeight) {
                    speedY *= -1;
                }

                icon.style.left = `${newX}px`;
                icon.style.top = `${newY}px`;
            }, 40);
        };
    });
    console.log("Floating icons created.");
}

function initiateFadeToWhiteAndRedirect() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'white';
    overlay.style.opacity = 0;
    overlay.style.transition = 'opacity 2s ease-in-out';
    overlay.style.zIndex = 9999;
    document.body.appendChild(overlay);

    const subtexts = document.querySelectorAll('.subtext');
    subtexts.forEach(subtext => {
        subtext.style.transition = 'color 2s ease-in-out';
        subtext.style.color = 'white';
    });

    setTimeout(() => {
        overlay.style.opacity = 1;
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 2000);
    }, 6000);
}

window.onload = () => {
    console.log("Window loaded.");
    const iconsData = [
        { localPath: 'icons/1.png' },
        { localPath: 'icons/2.png' },
        { localPath: 'icons/3.png' },
        { localPath: 'icons/4.png' },
        { localPath: 'icons/12.png' },
        { localPath: 'icons/11.png' },
        { localPath: 'icons/10.png' },
        { localPath: 'icons/9.png' },
        { localPath: 'icons/8.png' },
        { localPath: 'icons/7.png' },
        { localPath: 'icons/6.png' },
        { localPath: 'icons/5.svg.png' },
        { localPath: 'icons/13.png' },
        { localPath: 'icons/14.png' },
        { localPath: 'icons/16.png' },
        ];

    createFloatingIcons(iconsData);
    initiateFadeToWhiteAndRedirect();
};
