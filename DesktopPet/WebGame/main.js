const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");


let leftsocre=0;
let rightsocre=0;

let paused = false;


const paddleW = 10;
const paddleH = 80;

const leftPaddle = { x: 20,  y: 160, w: paddleW, h: paddleH  };
const rightPaddle = { x: 570, y: 160, w: paddleW, h: paddleH };
const ball = { x: 295, y: 195, w: 10, h: 10,vx:0, vy:0 };

const keys={}
window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === "Enter"&&paused===false) {
        if (ball.vx===0&&ball.vy===0){
            ball.vx=5;
            ball.vy=5;
        }
    }
    if (e.key === "r"&&paused===true) {
        paused = false;
        leftsocre=0
        rightsocre=0
        loop()
    }
});

window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
});


function draw() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.fillRect(leftPaddle.x,  leftPaddle.y,  leftPaddle.w,  leftPaddle.h);
    ctx.fillRect(rightPaddle.x, rightPaddle.y, rightPaddle.w, rightPaddle.h);
    ctx.fillRect(ball.x, ball.y, ball.w, ball.h);

    ctx.font = "25pt DSEG7";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.fillText(leftsocre,50,50)
    ctx.fillText(rightsocre,550,50)

    ctx.strokeStyle = "#e8e8d8";   // 暖白，不是纯白
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    ctx.strokeStyle = "#e8e8d8";
    ctx.lineJoin = "round";

    ctx.shadowColor = "#e8e8d8";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = "#e8e8d8";
    ctx.lineWidth = 4;
    ctx.shadowBlur = 0;   // 画完记得关掉，不然后面所有东西都发光

}
function update(){
    Ballupdate()
    KeyMove()
    AIMove()
    Collision()


}
function KeyMove(){
        if (keys["w"]===true){
            if(leftPaddle.y-4>=0){
                leftPaddle.y-=4;
            }

        }
        if (keys["s"]===true){
            if(leftPaddle.y+leftPaddle.h+4<=canvas.height){
                leftPaddle.y +=4;
            }
        }
}


function Ballupdate() {
    if(!(ball.vx===0&&ball.vy===0)){
        ball.x +=ball.vx
        ball.y +=ball.vy
    }
    if (ball.y < 0 ||ball.y+ball.h > canvas.height) {
        ball.vy=-ball.vy
    }
    if (ball.x > canvas.width) {
        leftsocre+=1
        Reset()
    }
    else if (ball.x < 0){
        rightsocre+=1
        Reset()
    }
}

function Collision(){
    if(!(leftPaddle.x+leftPaddle.w<ball.x //右边
    || leftPaddle.y+leftPaddle.h<ball.y //下边
    || leftPaddle.y>ball.y+ball.h  //上边
    || leftPaddle.x>ball.x+ball.w)) { //左边
        ball.x = leftPaddle.x + leftPaddle.w
        ball.vx = Math.abs(ball.vx)
    }

    else if (!(rightPaddle.x + rightPaddle.w < ball.x ||
        rightPaddle.x > ball.x + ball.w ||
        rightPaddle.y + rightPaddle.h < ball.y ||
        rightPaddle.y > ball.y + ball.h)) {
        ball.vx = -Math.abs(ball.vx);             // 强制往左
        ball.x = rightPaddle.x - ball.w;          // 推出
    }
}

function AIMove() {
    const paddleCenter = rightPaddle.y + rightPaddle.h / 2;
    const ballCenter = ball.y + ball.h / 2;

    if (ballCenter < paddleCenter - 10) {
        rightPaddle.y -= 4;
    } else if (ballCenter > paddleCenter + 10) {
        rightPaddle.y += 4;
    }
    // 边界限制
}

function loop(){
    update()
    draw()
    judge()
    if(!paused){
        requestAnimationFrame(loop)
    }

}
function judge(){
    if(paused===false){
        if(leftsocre===10||rightsocre===10){
            Stop()
        }
    }
}
function Reset(){
    ball.vx=0;
    ball.vy=0;
    ball.x = canvas.width / 2 - ball.w / 2;
    ball.y = canvas.height / 2 - ball.h / 2;
}
function Stop(){
    paused=true;
    ball.vx=0;
    ball.vy=0;
    ctx.font = "50pt DSEG7";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.fillText("Game Over",200,300)

}
loop()
console.log("Game Over!");

