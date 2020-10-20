const resultsCol = document.querySelector(".two-times__col");
const buttonSearchBox = document.querySelector(".top-header__formgroup");

// To go to home Section
jQuery(".s-back-button").on("click", () => {
    jQuery("#homesec").show();
    jQuery("#searchsec").hide();
    jQuery("#main-header").removeClass("secondary-header-bg");
    jQuery(".search-sec").css({ "z-index": "4", "top": "50vh", "padding-left": "0rem" })
});

buttonSearchBox.addEventListener("keyup", (e) => {
    if (e.keyCode === 13 || e.target.id === "search-auto") {
        displayFetchedResults();
    };
});

function displayFetchedResults() {
    const categoryData = document.getElementById("cars-category").value;
    const locationData = document.querySelector(".location-auto").value;
    const queryData = `${categoryData}+in+${locationData}`;
    const searchError = document.querySelector(".search-error");
    const searchTitle = document.querySelector(".search-result__title");

    if (
        categoryData.trim() !== "" &&
        locationData.trim() !== ""
    ) {
        // To go to search Section
        jQuery("#searchsec").show();
        jQuery("#homesec").hide();
        jQuery("#main-header").addClass("secondary-header-bg");
        jQuery(".search-sec").css({ "z-index": "4", "top": "0", "padding-left": "3rem", "padding-top": "1.5rem" })

        searchTitle.innerHTML = `${categoryData} In ${locationData}`;
        searchError.classList.add("d-none");
        resultsCol.innerHTML = `<div class="loader"></div>`;
        getSearchResults(queryData, locationData, categoryData);
    } else {
        searchError.classList.remove("d-none");
        searchError.innerHTML = `Enter in missing location or category`;
    }
}


let searchHistory = JSON.parse(localStorage.getItem("searchHistory")) || {};

let returnedSearchResults = {};

async function getSearchResults(queryData, location, term) {
    try {
        returnedSearchResults = {};
        if (
            searchHistory[queryData] &&
            Object.keys(searchHistory[queryData]).length > 0
        ) {
            returnedSearchResults = searchHistory[queryData];
        } else {
            //get yelp data
            const res = await getYelpData(location, term);
            //distribute the data only if results exists
            if (Object.keys(res).length < 1) {
                displayNoResults();
                return;
            }
            distrubuteYelpData(res);
            //   Save search history for testing /memoization
            searchHistory[queryData] = returnedSearchResults;
            // Save to local storage
            localStorage.setItem(`searchHistory`, JSON.stringify(searchHistory));
        }
        // Show Results on UI
        displayResults();
        // Initialize Map
        initMap();
    } catch (err) {
        console.log(err);
    }
}

const displayNoResults = () => {
    resultsCol.innerHTML = `<p class="no-search-results">No Results for this query. Try Another Search</p>`;
};

const displayResults = () => {
    resultsCol.innerHTML = "";
    Object.values(returnedSearchResults).forEach((business) => {
        const {
            id,
            name,
            image_url,
            url,
            review_count,
            rating,
            price,
            display_phone,
            categories,
            display_address,
            coordinates,
        } = business;
        resultsCol.insertAdjacentHTML(
            "beforeend",
            `<div class="search-result__box" onclick="initMap('${coordinates.latitude}', '${coordinates.longitude}')">
         <div class="intro-details d-flex">
           <div class="place-img">
             <img
             src="${image_url ||
            "https://www.carhuddle.com/images/default/car-default.jpg"
            }"
             alt="car image" />
           </div>
           <div class="place-name-details">
             <p class="place-result-name">${name}</p>
             <p class="place-result-rating">
               ${generateReviewStars(rating)}
               <strong>${rating}</strong> (${review_count})
             </p>
             <p class="place-result-address">
               ${display_address}
             </p>
             <button class="place-operation-hours" onclick="displayBusinessHours('${id}')">
             <i class="fa fa-clock-o" aria-hidden="true"></i>
             Hours of Operation
             </button>
            <p class="place-cost">Cost - ${displayPriceValue(price)}</p>
           </div>
         </div>
         <div class="other-details">
           <p class="isOpen">Business Status: Operational</p>
           <p class="featured-in">
             Types: ${categories[0].title}
           </p>
         </div>
         <div class="cta-details d-flex">
           <button class="callBtn" onclick="displayPhoneNumber('${display_phone}')">
             <i class="fa fa-phone" aria-hidden="true"></i> <a>Call</a>
           </button>
           <button class="directionBtn">
             <i class="fa fa-location-arrow" aria-hidden="true"></i> <a href="https://www.google.com/maps/dir/${name}${display_address}/Current Location" target="_blank">Find
             Directions</a>
           </button>
           <button class="reviewsBtn" onclick="getBusinessReviews('${id}')">
             <i class="fa fa-star-o" aria-hidden="true"></i> <a>See Reviews</a>
           </button>
           <button class="yelpBusinessBtn">
            <i class="fa fa-yelp" aria-hidden="true"></i> <a target="_blank" href="${url}">Visit Yelp Page</a>
           </button>
         </div>
       </div>`
        );
    });
};

function displayPhoneNumber(number) {
    const modalContent = document.querySelector(".modal-detail-content");
    modalContent.innerHTML = `<div class="place-phone-number">Phone Number<br><span>${number}</span></div>`;
    openModal();
}

async function getBusinessReviews(id) {
    showLoader("modal-detail-content");
    openModal();
    const res = await fetchBusinessReviews(id);
    displayBusinessReviews(res);
}

function showLoader(className) {
    document.querySelector(
        `.${className}`
    ).innerHTML = `<div class="loader"></div>`;
}

function displayBusinessReviews(reviews) {
    const modalContent = document.querySelector(".modal-detail-content");
    if (reviews && reviews.length > 0) {
        let allReviews = reviews
            .map((review) => {
                return `<div class="testimonial-box">
          <div class="testi-img-box">
           <img src="${review.user.image_url ||
                    "https://qph.fs.quoracdn.net/main-qimg-6d72b77c81c9841bd98fc806d702e859"
                    }" class="testi-img" alt="testifier image"/>
          </div>
          <div>
          <p class="testi-name">${review.user.name}</p>
            <p class="testi-rating"><strong>${review.rating
                    }</strong> <i class="fa fa-star" aria-hidden="true"></i> Rating</p>
         <p class="testi-review">${review.text}</p>
        </div>
        </div>`;
            })
            .join("");
        modalContent.innerHTML = allReviews;
    } else {
        modalContent.innerHTML = `No Reviews`;
    }
}


async function fetchBusinessReviews(id) {
    try {
        const res = await fetch(
            `https://cors-anywhere.herokuapp.com/https://api.yelp.com/v3/businesses/${id}/reviews`,
            {
                method: "GET",
                headers: {
                    Authorization:
                        "Bearer 7y646sS-o3rJfoCzeGJwm1W_U3kro-xdbEHcivHHeh1hbX_Kc-BOXHCqMv0-yayz5oJ_fxpFWCP--Y_7tU5U3reFYRXDC688bCG4b386rc1OQj_vNAK5bKQ7vvMzX3Yx",
                    "Content-Type": "application/json",
                },
            }
        );
        const data = await res.json();
        const results = data.reviews;
        return results;
    } catch (err) {
        console.log(err);
    }
}

function prettierTime(str) {
    const firstStr = str.slice(0, 2);
    const secondStr = str.slice(2, 4);
    let finalStr = ``;
    if (Number(firstStr) < 12) {
        finalStr = `${firstStr}:${secondStr} am`
    }
    else if (Number(firstStr) === 12) {
        finalStr = `12:00 pm`
    }
    else {
        finalStr = `${firstStr - 12}:${secondStr} pm`
    }
    return finalStr;
}

async function displayBusinessHours(id) {
    const modalContent = document.querySelector(".modal-detail-content");
    const res = await getBusinessHours(id);


    modalContent.innerHTML = `
    <ul class="place-business-hours">
      <li class="place-business-hours-title">Operation Hours</li>
      <li>Mon: ${res[0] ? prettierTime(res[0].start) : "Closed"} - ${res[0] ? prettierTime(res[0].end) : ""}</li>
      <li>Tues: ${res[1] ? prettierTime(res[1].start) : "Closed"} - ${res[1] ? prettierTime(res[1].end) : ""}</li>
      <li>Wed: ${res[2] ? prettierTime(res[2].start) : "Closed"} - ${res[2] ? prettierTime(res[2].end) : ""}</li>
      <li>Thurs: ${res[3] ? prettierTime(res[3].start) : "Closed"} - ${res[3] ? prettierTime(res[3].end) : ""}</li>
      <li>Frid: ${res[4] ? prettierTime(res[4].start) : "Closed"} - ${res[4] ? prettierTime(res[4].end) : ""}</li>
      <li>Sat: ${res[5] ? prettierTime(res[5].start) : "Closed"} - ${res[5] ? prettierTime(res[5].end) : ""}</li>
      <li>Sun: ${res[6] ? prettierTime(res[6].start) : "Closed"} - ${res[6] ? prettierTime(res[6].end) : ""}</li>
    </ul>`;
    openModal();
}

async function getBusinessHours(id) {
    try {
        const res = await fetch(
            `https://cors-anywhere.herokuapp.com/https://api.yelp.com/v3/businesses/${id}`,
            {
                method: "GET",
                headers: {
                    Authorization:
                        "Bearer 7y646sS-o3rJfoCzeGJwm1W_U3kro-xdbEHcivHHeh1hbX_Kc-BOXHCqMv0-yayz5oJ_fxpFWCP--Y_7tU5U3reFYRXDC688bCG4b386rc1OQj_vNAK5bKQ7vvMzX3Yx",
                    "Content-Type": "application/json",
                },
            }
        );
        const data = await res.json();
        const results = data.hours[0].open;
        return results;
    } catch (err) {
        console.log(err);
    }
}



async function getYelpData(location, name) {
    try {
        const res = await fetch(
            `https://cors-anywhere.herokuapp.com/https://api.yelp.com/v3/businesses/search?location=${location}&term=${name}&sort_by=distance&categories=auto`,
            {
                method: "GET",
                headers: {
                    Authorization:
                        "Bearer 7y646sS-o3rJfoCzeGJwm1W_U3kro-xdbEHcivHHeh1hbX_Kc-BOXHCqMv0-yayz5oJ_fxpFWCP--Y_7tU5U3reFYRXDC688bCG4b386rc1OQj_vNAK5bKQ7vvMzX3Yx",
                    "Content-Type": "application/json",
                },
            }
        );
        const data = await res.json();
        const results = data.businesses;
        if (results) {
            return results;
        } else {
            displayNoResults();
        }
    } catch (err) {
        console.log(err);
    }
}

function distrubuteYelpData(results) {
    results.forEach((result) => {
        const {
            id,
            name,
            image_url,
            url,
            review_count,
            rating,
            price,
            display_phone,
            categories,
            coordinates,
            location: { display_address },
        } = result;

        returnedSearchResults[name] = {
            id,
            name,
            price,
            image_url,
            url,
            review_count,
            rating,
            display_phone,
            categories,
            coordinates,
            display_address,
        };
    });
}

async function categoryAutocomplete(text) {
    if (text.trim()) {
        try {
            const res = await fetch(
                `https://cors-anywhere.herokuapp.com/https://api.yelp.com/v3/autocomplete?text=${text}`,
                {
                    method: "GET",
                    headers: {
                        Authorization:
                            "Bearer 7y646sS-o3rJfoCzeGJwm1W_U3kro-xdbEHcivHHeh1hbX_Kc-BOXHCqMv0-yayz5oJ_fxpFWCP--Y_7tU5U3reFYRXDC688bCG4b386rc1OQj_vNAK5bKQ7vvMzX3Yx",
                        "Content-Type": "application/json",
                    },
                }
            );
            const data = await res.json();
            const results = data.categories;
            return results;

        } catch (err) {
            console.log(err);
        }
    }
}

async function displayAutocomplete() {

    // carList.innerHTML = ``;
    // // check locations and suggest locations that match the value
    // const carCategories = await categoryAutocomplete(categoryData.value);
    // console.log(carCategories);
    // if(carCategories){
    //     carCategories.forEach((cat) => {
    //         // display location box and feed to the locations box
    //         carList.insertAdjacentHTML(
    //             "beforeend",
    //             `<li class="car-item">${cat.title}</li>`
    //         );
    // });


    // }  
    // carList.classList.remove("hidden");
}


// Car Category autosuggest


const categoryData = document.getElementById("cars-category");
const carList = document.querySelector(".cars-list");
categoryData.addEventListener("keyup", displayAutocomplete);

// categoryData.addEventListener("keydown", () => {

// })

carList.addEventListener("click", (e) => {
    if (e.target.className === "car-item") {
        categoryData.value = e.target.textContent;
        carList.classList.add("hidden");
    }
});

// Get the modal
let modal = document.getElementById("myModal");

// Get the <span> element that closes the modal
let span = document.getElementsByClassName("close")[0];

// When the user clicks on the button, open the modal
function openModal() {
    modal.style.display = "block";
    jQuery(".search-sec").css({ "z-index": "0" })
}

// When the user clicks on <span> (x), close the modal
span.onclick = function () {
    modal.style.display = "none";
    jQuery(".search-sec").css({ "z-index": "4" })
};

// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
};


const generateReviewStars = (num) => {
    const halfStar = `<i class="fa fa-star-half-o" aria-hidden="true"></i>`;
    const fullStar = `<i class="fa fa-star" aria-hidden="true"></i>`;
    const emptyStar = `<i class="fa fa-star-o" aria-hidden="true"></i>`;
    const wholeNumber = Number(`${num}`[0]);
    const decimalNumber = Number(`${num}`[2]);
    const emptyStarsNumber = 5 - Math.round(num);

    let output = ``;

    // Find number of iterations and iterate
    if (wholeNumber === 0) {
        // return empty star
        return emptyStar;
    }

    // Generate stars
    for (let i = 0; i < wholeNumber; i++) {
        output += fullStar;
    }

    if (decimalNumber > 4) {
        output += halfStar;
    }
    // add empty stars
    if (emptyStarsNumber > 0) {
        for (let i = 0; i < emptyStarsNumber; i++) {
            output += emptyStar;
        }
    }

    return output;

}


const displayPriceValue = (param) => {
    if (param) {
        return `<span class="some-dollars">${param}</span>` + `<span class="no-dollars">${"$".repeat(5 - param.length)}</span>`;
    }
    return `<span class="no-dollars">$$$$$</span>`
}

function initialize() {
    initMap();
    initAutocomplete();
}

// Autolocation
let autocomplete;


function initAutocomplete() {
    autocomplete = new google.maps.places.Autocomplete(
        document.getElementById("autocomplete"),
        {
            types: ["geocode"]
        }
    );
}

// Bias the autocomplete object to the user's geographical location,
// as supplied by the browser's 'navigator.geolocation' object.

function geolocate() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const geolocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            const circle = new google.maps.Circle({
                center: geolocation,
                radius: position.coords.accuracy
            });
            autocomplete.setBounds(circle.getBounds());
        });
    }
}

let map;



function generateMapMarkers() {
    const iterableResults = Object.values(returnedSearchResults);
    const res = [];
    for (let i = 0; i < iterableResults.length; i++) {
        res.push({ position: new google.maps.LatLng(iterableResults[i].coordinates.latitude, iterableResults[i].coordinates.longitude), type: 'info' });
    }
    return res;
}



function initMap(lat, long) {
    // Make init map when passed in a parameter to show the exact location of a specific place and a marker right there
    const icons = {
        url: "http://slickwiz-com.stackstaging.com/wp-content/uploads/2020/09/152-1526672_circle-red-car-icon-hd-png-download-removebg-preview.png", // url
        scaledSize: new google.maps.Size(30, 30), // scaled size
        origin: new google.maps.Point(0, 0), // origin
        anchor: new google.maps.Point(0, 0) // anchor
    };

    if (!long && !lat) {
        const features = generateMapMarkers();
        map = new google.maps.Map(
            document.getElementById('map'),
            { center: features.length > 0 ? features[0].position : new google.maps.LatLng(-33, 40), zoom: 16 });

        // Create markers.
        for (let i = 0; i < features.length; i++) {
            let marker = new google.maps.Marker({
                position: features[i].position,
                icon: icons,
                map: map
            });
        };
    } else {
        map = new google.maps.Map(
            document.getElementById('map'),
            { center: new google.maps.LatLng(lat, long), zoom: 12 });
        let marker = new google.maps.Marker({
            position: new google.maps.LatLng(lat, long), type: 'info',
            icon: icons,
            map: map
        });
    }

}
