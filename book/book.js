function fitCoverTitleFontSize(h3, container, minSize = 10, maxSize = 100) {
    const clone = h3.cloneNode(true);
    clone.style.position = "absolute";
    clone.style.visibility = "hidden";
    container.appendChild(clone);

    let low = minSize;
    let high = maxSize;
    let bestFit = minSize;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        clone.style.fontSize = mid + "px";

        if (clone.scrollWidth <= container.clientWidth * 0.9) {
            bestFit = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    container.removeChild(clone);
    h3.style.fontSize = bestFit + "px";
    h3.style.visibility = "visible";
}

async function buildBook() {
    const body = document.querySelector('body');

    body.innerHTML += `<div class="book-container">
        <div class="book">
            <div class="page-container first">
                <div class="page front cover">
                    <h3>История детского сада "Солнышко"</h3>
                </div>
                <div class="page back"></div>
            </div>

            <div class="page-container last">
                <div class="page front"></div>
                <div class="page back cover">
                </div>
            </div>
        </div>
    </div>`;



    const bookTitleEl = document.getElementById("book-title");

    if (bookTitleEl) {
        const titleText = bookTitleEl.textContent.trim();
        bookTitleEl.remove();

        const h3 = document.querySelector(".page.front.cover h3");
        if (h3) {
            h3.textContent = titleText;
            fitCoverTitleFontSize(h3, h3.parentElement);
        }
    }

    const book = document.querySelector(".book");
    const contentContainer = document.getElementById("book-content");
    const lastPageContainer = document.querySelector(".page-container.last");

    if (!contentContainer) return;

    const tempPage = document.createElement("div");
    tempPage.classList.add("page");
    tempPage.style.position = "relative";
    tempPage.style.visibility = "hidden";
    tempPage.style.padding = "10px 25px 10px 25px";

    const coverPage = document.querySelector(".page.front.cover");
    const rect = coverPage.getBoundingClientRect();

    tempPage.style.width = rect.width + "px";
    tempPage.style.height = rect.height - 40 + "px";

    document.body.appendChild(tempPage);

    const fullContent = Array.from(contentContainer.childNodes).filter(
        n => n.nodeType !== 3 || n.textContent.trim() !== ""
    );

    let pageNum = 1;
    let currentPair = null;
    let currentPage = null;

    const createNewPage = (isFront) => {
        if (!currentPair || isFront) {
            currentPair = document.createElement("div");
            currentPair.classList.add("page-container");

            const front = document.createElement("div");
            front.classList.add("page", "front");

            const back = document.createElement("div");
            back.classList.add("page", "back");

            currentPair.appendChild(front);
            currentPair.appendChild(back);
            book.insertBefore(currentPair, lastPageContainer);
        }

        const page = currentPair.querySelector(isFront ? ".front" : ".back");

        const pageNumDiv = document.createElement("div");
        pageNumDiv.classList.add("page-num");
        pageNumDiv.textContent = pageNum++;
        page.appendChild(pageNumDiv);

        return page;
    };

    const waitForImages = (el) => {
        const images = el.querySelectorAll("img");
        const promises = Array.from(images).map(img => {
            if (img.complete && img.naturalHeight !== 0) {
                return Promise.resolve();
            }
            return new Promise((resolve) => {
                const onLoadOrError = () => {
                    img.removeEventListener('load', onLoadOrError);
                    img.removeEventListener('error', onLoadOrError);
                    resolve();
                };
                img.addEventListener('load', onLoadOrError);
                img.addEventListener('error', onLoadOrError);
            });
        });
        return Promise.all(promises);
    };

    const addToPage = async (node) => {
        if (!currentPage) {
            currentPage = createNewPage(true);
        }

        const nonPageNumElements = Array.from(currentPage.childNodes)
            .filter(n => !n.classList || !n.classList.contains("page-num"));

        const clone = node.cloneNode(true);

        tempPage.innerHTML = "";
        tempPage.append(...nonPageNumElements.map(n => n.cloneNode(true)));
        tempPage.appendChild(clone);

        await waitForImages(tempPage);

        const fits = tempPage.scrollHeight <= tempPage.clientHeight;

        if (fits && nonPageNumElements.length > 0) {
            currentPage.insertBefore(node, currentPage.querySelector(".page-num"));
            return;
        }

        if (fits && nonPageNumElements.length === 0) {
            currentPage.insertBefore(node, currentPage.querySelector(".page-num"));
            return;
        }

        if (node.nodeName === "P" && nonPageNumElements.length <= 1) {

            function splitTextWithInitials(text) {
                const normalizedText = text.replace(/\s+/g, ' ').trim();

                const initialsWithComma = /(?:[А-ЯA-Z]\.){1,3},?/;

                const parts = normalizedText.match(new RegExp(`${initialsWithComma.source}|[^.!?]+[.!?]+`, 'g')) || [];

                const sentences = [];
                let buffer = "";

                parts.forEach(part => {
                    if (initialsWithComma.test(part)) {
                        buffer += (buffer ? " " : "") + part;
                    } else {
                        if (buffer) {
                            buffer += " " + part;
                            sentences.push(buffer.trim());
                            buffer = "";
                        } else {
                            sentences.push(part.trim());
                        }
                    }
                });

                if (buffer) sentences.push(buffer.trim());

                return sentences;
            }

            const sentences = splitTextWithInitials(node.textContent);
            if (!sentences || sentences.length === 0) return;

            let existing = [];
            if (currentPage.querySelectorAll(".page-num").length === currentPage.childNodes.length) {
                existing = [];
            } else {
                existing = Array.from(currentPage.childNodes)
                    .filter(n => !n.classList.contains("page-num"))
                    .map(n => n.cloneNode(true));
            }

            const testP = document.createElement("p");
            tempPage.innerHTML = "";
            tempPage.append(...existing);
            tempPage.appendChild(testP);

            let low = 0;
            let high = sentences.length;
            let fitIndex = 0;

            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                testP.textContent = sentences.slice(0, mid).join(" ").trim();

                if (tempPage.scrollHeight <= tempPage.clientHeight) {
                    fitIndex = mid;
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }

                console.log(testP.textContent)
                console.log(low + " " + high)
            }

            if (fitIndex === 0) {
                currentPage = createNewPage(!currentPage.classList.contains("front"));
                await addToPage(node);
                return;
            }

            const firstP = document.createElement("p");
            firstP.textContent = sentences.slice(0, fitIndex).join(" ").trim();
            currentPage.insertBefore(firstP, currentPage.querySelector(".page-num"));

            const remainingText = sentences.slice(fitIndex).join(" ").trim();
            if (remainingText.length > 0) {
                const secondP = document.createElement("p");
                secondP.textContent = remainingText;
                await addToPage(secondP);
            }

            return;
        }

        const isSingleImageBlock = (node) => {
            if (node.tagName === "IMG") return true;

            if (
                node.classList.contains("book-img-title") &&
                node.querySelectorAll("img").length === 1 &&
                node.querySelectorAll("p").length === 1
            ) {
                return true;
            }

            if (
                node.classList.contains("book-img-container") &&
                node.querySelectorAll("img").length > 1
            ) {
                return false;
            }

            return false;
        };

        if (isSingleImageBlock(node)) {
            const img = node.tagName === "IMG" ? node : node.querySelector("img");

            await waitForImages(node);

            tempPage.appendChild(node);

            await new Promise(requestAnimationFrame);

            const style = getComputedStyle(tempPage);
            const paddingTop = parseFloat(style.paddingTop);
            const paddingBottom = parseFloat(style.paddingBottom);
            const paddingLeft = parseFloat(style.paddingLeft);
            const paddingRight = parseFloat(style.paddingRight);

            const maxHeight = tempPage.clientHeight - paddingTop - paddingBottom;
            const maxWidth = tempPage.clientWidth - paddingLeft - paddingRight;

            let captionHeight = 0;
            if (node.classList.contains("book-img-title")) {
                const caption = node.querySelector("p");
                if (caption) {
                    const testWrapper = document.createElement("div");
                    testWrapper.style.visibility = "hidden";
                    testWrapper.style.position = "absolute";
                    testWrapper.appendChild(caption.cloneNode(true));
                    document.body.appendChild(testWrapper);
                    captionHeight = testWrapper.scrollHeight;
                    document.body.removeChild(testWrapper);
                }
            }

            const availableHeight = maxHeight - captionHeight;
            const availableWidth = maxWidth;

            const rect = img.getBoundingClientRect();
            const currentWidth = rect.width;
            const currentHeight = rect.height;

            if (currentHeight > availableHeight || currentWidth > availableWidth) {
                const scale = Math.min(
                    availableHeight / currentHeight,
                    availableWidth / currentWidth,
                    1
                );

                img.style.width = currentWidth * scale + "px";
                img.style.height = currentHeight * scale + "px";
            } else {
                img.style.width = currentWidth + "px";
                img.style.height = currentHeight + "px";
            }

            currentPage = createNewPage(!currentPage.classList.contains("front"));
            currentPage.insertBefore(node, currentPage.querySelector(".page-num"));

            if (node.parentNode === tempPage) {
                tempPage.removeChild(node);
            }

            return;
        }

        currentPage = createNewPage(!currentPage.classList.contains("front"));
        currentPage.insertBefore(node, currentPage.querySelector(".page-num"));
    };


    for (const node of fullContent) {
        if (node.nodeType === 1 || (node.nodeType === 3 && node.textContent.trim() !== "")) {
            await addToPage(node);
        }
    }

    document.body.removeChild(tempPage);

    const pageContainers = document.querySelectorAll('.page-container');
    const baseZ = 100;

    pageContainers.forEach((container, index) => {
        container.style.zIndex = baseZ - index;
    });
}

function initFlipbook() {
    const flipSound = new Audio("../book/flip.mp3");

    let isFlipping = false

    const book = document.querySelector('.book');
    const pages = Array.from(document.querySelectorAll('.page-container'));

    function playFlip() {
        flipSound.currentTime = 0;
        flipSound.playbackRate = 2.5;
        flipSound.play();
    }


    pages.forEach((p, index) => {
        const front = p.querySelector('.front');
        const back = p.querySelector('.back');

        function handleClick({ flip, addBookClass, removeBookClass }) {
            if (isFlipping) return;
            isFlipping = true;

            playFlip()

            p.style.zIndex = 1000;
            if (flip) {
                p.classList.add('flipped');
            } else {
                p.classList.remove('flipped');
            }

            if (addBookClass) book.classList.add(addBookClass);
            if (removeBookClass) book.classList.remove(removeBookClass);

            function onTransitionEnd(event) {
                if (event.propertyName === 'transform') {
                    p.style.zIndex = flip ? (100 + index) : (100 - index);
                    isFlipping = false;
                    p.removeEventListener('transitionend', onTransitionEnd);
                }
            }

            p.addEventListener('transitionend', onTransitionEnd);
        }

        switch (index) {
            case 0:
                front.addEventListener('click', () =>
                    handleClick({
                        flip: true,
                        addBookClass: 'opened',
                        removeBookClass: 'closed'
                    })
                );
                back.addEventListener('click', () =>
                    handleClick({
                        flip: false,
                        addBookClass: 'closed',
                        removeBookClass: 'opened'
                    })
                );
                break;

            case pages.length - 1:
                front.addEventListener('click', () =>
                    handleClick({
                        flip: true,
                        addBookClass: 'closed'
                    })
                );
                back.addEventListener('click', () =>
                    handleClick({
                        flip: false,
                        addBookClass: 'opened',
                        removeBookClass: 'closed'
                    })
                );
                break;

            default:
                front.addEventListener('click', () =>
                    handleClick({ flip: true })
                );
                back.addEventListener('click', () =>
                    handleClick({ flip: false })
                );
                break;
        }
    });
}

buildBook().then(() => {
    initFlipbook();
});

window.addEventListener('DOMContentLoaded', () => {

    if (location.protocol !== 'file:') {
        console.log(location.protocol);
        const controlsHTML = `
    <div class="book-controls">
      <button id="prevPage" style="margin-right: 10px; display: none">← Назад</button>
      <button id="nextPage" style="display: none;">Вперёд →</button>
      <div class="book-controls-end">
    <button id="download" class="icon-button">
      <svg viewBox="0 0 24 24" class="icon">
        <path d="M12 3v12m0 0l-5-5m5 5l5-5M5 21h14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    
    <button id="close" class="icon-button">
      <svg viewBox="0 0 24 24" class="icon">
        <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
      </div>
    </div>
    `;
        document.querySelector('.book').insertAdjacentHTML('beforeend', controlsHTML);

        document.getElementById("download").addEventListener("click", () => {
            const controls = document.querySelector(".book-controls");
            let parent = null;
            let nextSibling = null;

            if (controls) {
                parent = controls.parentNode;
                nextSibling = controls.nextSibling;
                parent.removeChild(controls);
            }

            const html = document.documentElement.outerHTML;

            if (controls && parent) {
                if (nextSibling) {
                    parent.insertBefore(controls, nextSibling);
                } else {
                    parent.appendChild(controls);
                }
            }

            const blob = new Blob([html], { type: "text/html" });
            const url = URL.createObjectURL(blob);

            const path = window.location.pathname;
            const filename = path.substring(path.lastIndexOf('/') + 1);

            const a = document.createElement("a");
            a.href = url;
            a.download = decodeURIComponent(filename);
            document.body.appendChild(a);
            a.click();
            a.remove();

            URL.revokeObjectURL(url);
        });

        document.getElementById('close').addEventListener('click', () => {
            window.history.back();
        });

    }
});


