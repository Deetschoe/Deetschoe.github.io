document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM fully loaded and parsed");

    var contentSlide = document.querySelector('.content-slide');
    
    contentSlide.style.opacity = 0;

    setTimeout(() => {
        console.log("Starting transition for .content-slide");
        contentSlide.style.opacity = 1;
    }, 100);
});
