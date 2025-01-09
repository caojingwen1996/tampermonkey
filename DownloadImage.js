// ==UserScript==
// @name         获取下载链接
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  Download all images from the webpage(add auto page)
// @author       Your Name
// @match        *://*/*
// @grant        none
// @run-at       document-end
// @require      https://cdn.staticfile.org/jszip/3.5.0/jszip.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js

// ==/UserScript==

(function () {
  "use strict";

  // Create a button for downloading images
  var jszip = new JSZip();
  const downloadButton = document.createElement("button");
  downloadButton.textContent = "Download Images2";
  downloadButton.style.position = "fixed";
  downloadButton.style.top = "10px";
  downloadButton.style.right = "10px";
  downloadButton.style.zIndex = 10000;
  downloadButton.style.padding = "10px";
  downloadButton.style.backgroundColor = "#007BFF";
  downloadButton.style.color = "white";
  downloadButton.style.border = "none";
  downloadButton.style.cursor = "pointer";

  document.body.appendChild(downloadButton);



 //模拟自动翻页
async function simulateScrollToBottom() {
  return new Promise((resolve) => {
    const intervalId = setInterval(() => {
      // 向下滚动 100px
      window.scrollBy(0, 100);

      // 检查是否已经到达页面底部
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight) {
        console.log('Reached the bottom of the page.');
        clearInterval(intervalId);  // 停止滚动
        resolve();  // 结束并 resolve Promise
      }
    }, 100);  // 每 100 毫秒滚动一次
  });
}
function getAllBackgroundImages() {
  const allElements = document.querySelectorAll('*');  // 获取页面中的所有元素
  const imageUrls = [];

  allElements.forEach((element) => {
    // 获取元素的背景图样式
    const backgroundImage = window.getComputedStyle(element).backgroundImage;

    // backgroundImage 的值通常是 'url("...")' 形式，提取 URL 部分
    const match = backgroundImage.match(/url\(["']?(.*?)["']?\)/);

    if (match && match[1]) {
      imageUrls.push(match[1]);  // 将图片 URL 添加到数组中

    }
  });

  return imageUrls;
}
    function getAllImageUrls() {
  const images = document.querySelectorAll('img');  // 获取所有 img 标签
  const imageUrls = [];

  images.forEach((img) => {
    const url = img.src || img.dataset.src;  // 获取 src 或者 data-src
    if (url) {
      imageUrls.push(url);  // 将图片 URL 添加到数组中
    }
  });

  return imageUrls;
}


  async function downloadAndConvertToJPG(url, filename) {
    try {
      // 获取图片的二进制数据
      const response = await fetch(url, { cache: "no-cache" });

      console.log(
        `Response received for:${filename},url: ${url}, Status: ${response.status}`
      );
      if (!response.ok) throw new Error("Failed to fetch image");

      const imageBlob = await response.blob(); // 获取图片的二进制数据

      // 创建图片元素来加载图片
      const img = new Image();
      const objectURL = URL.createObjectURL(imageBlob);

      // 等待图片加载完成
      return new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            //console.log(`Image loaded: ${filename}`);
            // 创建一个 canvas 元素
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            // 设置 canvas 的宽度和高度
            canvas.width = img.width;
            canvas.height = img.height;

            // 将图片绘制到 canvas 上
            ctx.drawImage(img, 0, 0);

            const jpgDataUrl = canvas.toDataURL("image/jpeg");
            const jpgData = dataURLtoBlob(jpgDataUrl);
            jszip.file(filename, jpgData);
            downloadButton.textContent = `Downloading ${filename} ...`;

            resolve();
          } catch (error) {
            console.error(`Error loading image: ${filename}`, error);
          }
        };

        img.onerror = (error) => {
          //console.error(`Error loading image: ${filename}`, error);
          reject(error);
        };

        // 开始加载图片
        img.src = objectURL;
      });
    } catch (error) {
      console.error(error);
    }
  }
  function dataURLtoBlob(dataURL) {
    const byteString = atob(dataURL.split(",")[1]);
    const mimeString = dataURL.split(",")[0].split(":")[1].split(";")[0];
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uintArray = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
      uintArray[i] = byteString.charCodeAt(i);
    }

    return new Blob([uintArray], { type: mimeString });
  }

  // Function to handle image downloads
  async function handleDownload() {
    downloadButton.textContent = "downloading...";

     await simulateScrollToBottom();

    const imgUrls = getAllImageUrls();
    const backgroundUrls=  getAllBackgroundImages();
    const allUrls = [...imgUrls, ...backgroundUrls];
    console.log('图片张数：',allUrls.length);
    const downloadPromises = Array.from(allUrls).map((url, index) => {
      const filename = `image_${index + 1}.jpg`;
      // console.log(`Starting download for ${filename}`);
      // 返回每个下载操作的 Promise
      return downloadAndConvertToJPG(url, filename)
        .then(() => {})
        .catch((error) => {
          console.error(`Error downloading ${filename}:`, error);
          return null; // 即使下载失败，也继续执行其他下载
        });
    });

    // 等待所有下载操作完成
    await Promise.all(downloadPromises);
    // 创建一个 zip 文件并触发下载
    jszip.generateAsync({ type: "blob" }).then(function (content) {
      // 使用 FileSaver.js 下载 zip 文件
      saveAs(content, "images.zip");
      downloadButton.textContent = "Download Images";
      // clearInterval(intervalId);
      alert("All images have been packaged into a zip file!");
    });
  }
  // Add event listener to the button
  downloadButton.addEventListener("click", handleDownload);
})();
