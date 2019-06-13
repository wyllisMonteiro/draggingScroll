var $ = require('jquery')

var canvasW;
var canvasH;
var W = window.innerWidth
var canMouseX = 0
var canMouseY = 0

draggingScroll()

// Not use
function draggingMouse() {
    $(document).ready(function() {

        var img = new Image();
        img.onload = function(){
            ctx.drawImage(img, 0,0, canvasW, canvasH);
        };
        img.src = "http://images.christmastimeclipart.com/images/2/1271716593176_1788/img_1271716593176_17881.jpg";
    
        var canvas = document.getElementById("canvas");
        var ctx = canvas.getContext("2d");
        var canvasOffset = $("#canvas").offset();
        var offsetX = canvasOffset.left;
        var offsetY = canvasOffset.top;
        var canvasWidth = canvas.width;
        var canvasHeight = canvas.height;
        var isDragging = false;
    
        function handleMouseDown(e){
          isDragging = true;
        }
    
        function handleMouseUp(e){
          isDragging=false;
        }
    
        function handleMouseOut(e){
          isDragging = false;
        }
    
        function handleMouseMove(e){
    
          canMouseX = parseInt(e.clientX - offsetX);
          canMouseY = parseInt(e.clientY - offsetY);
    
          if(isDragging){
              ctx.clearRect(0,0, canvasWidth, canvasHeight);
              ctx.drawImage(img, canMouseX - canvasW/2, canMouseY - canvasH/2, canvasW, canvasH);
          }
        }
    
        $("#canvas").mousedown(function(e){handleMouseDown(e);});
        $("#canvas").mousemove(function(e){handleMouseMove(e);});
        $("#canvas").mouseup(function(e){handleMouseUp(e);});
        $("#canvas").mouseout(function(e){handleMouseOut(e);});
    
    })
}

function draggingScroll() {
    $(document).ready(function() {

        var canvas = document.getElementById("canvas");
        var ctx = canvas.getContext("2d");
        var canvasOffset = $("#canvas").offset();
        var offsetX = canvasOffset.left;
        var offsetY = canvasOffset.top;
        var canvasWidth = canvas.width;
        var canvasHeight = canvas.height;

        $(".container").css({
            width: W,
            height: W / 2
        });

        $("#canvas").attr({
            width: W,
            height: W / 2
        });

        var img = new Image();
        img.onload = function(){
            canvasW = 5376
            canvasH = 2688
            ctx.drawImage(img, 0,0, canvasW, canvasH);
        };
        img.src = "bunny.png";

        function handleScroll(e) {

            setScrollPosition()

            //var image = new Image()

            //image.addEventListener('load', function() {
                ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                ctx.drawImage(img, canMouseX, canMouseY, canvasW, canvasH);
            //})

            //image.src = bases64[bases64.length - 1]

        }

        function getScrollBarWidth() {
            var inner = document.createElement('p');
            inner.style.width = "100%";
            inner.style.height = "200px";
          
            var outer = document.createElement('div');
            outer.style.position = "absolute";
            outer.style.top = "0px";
            outer.style.left = "0px";
            outer.style.visibility = "hidden";
            outer.style.width = "200px";
            outer.style.height = "150px";
            outer.style.overflow = "hidden";
            outer.appendChild (inner);
          
            document.body.appendChild (outer);
            var w1 = inner.offsetWidth;
            outer.style.overflow = 'scroll';
            var w2 = inner.offsetWidth;
            if (w1 == w2) w2 = outer.clientWidth;
          
            document.body.removeChild (outer);
          
            return (w1 - w2);
        };

        function setScrollPosition() {
            var scrollBar = getScrollBarWidth()
            var scrollX = $(".container").scrollLeft();
            var scrollY = $(".container").scrollTop();

            var mouseX = parseInt(-scrollX + offsetX);
            var mouseY = parseInt(-scrollY + offsetY);

            if(-mouseX > scrollBar) {
                if(mouseX < canMouseX) canMouseX = mouseX + getScrollBarWidth()
                else canMouseX = mouseX
            } else canMouseX = mouseX

            if(-mouseY > scrollBar) {
                if(mouseY < canMouseY) canMouseY = mouseY + getScrollBarWidth()
                else canMouseY = mouseY
            } else canMouseY = mouseY
        }
    
        $(".container").scroll(function (e) { handleScroll(e); });
    
    })
}