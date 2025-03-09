document.addEventListener('DOMContentLoaded', function() {
  // Elementi pro přepínání zobrazení formuláře/mapy
  const toggleFormBtn = document.getElementById('toggleFormBtn');
  const closeFormBtn = document.getElementById('closeFormBtn');
  const floatingPlanBtn = document.getElementById('floatingPlanBtn');
  const sidebar = document.getElementById('planForm');
  const overlay = document.getElementById('overlay');

  // Responzivní přepínání mezi formulářem a mapou na mobilní verzi
  function toggleSidebar() {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    document.body.classList.toggle('sidebar-open');
  }

  toggleFormBtn.addEventListener('click', toggleSidebar);
  closeFormBtn.addEventListener('click', toggleSidebar);
  floatingPlanBtn.addEventListener('click', toggleSidebar);
  overlay.addEventListener('click', toggleSidebar);

  // Kontrola šířky okna a automatické zobrazení/skrytí sidebaru
  function checkWindowSize() {
    // Na desktopu vždy zobrazit sidebar a skrýt overlay
    if (window.innerWidth >= 992) {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
      document.body.classList.remove('sidebar-open');
    }
  }

  // Kontrola při načtení a při změně velikosti okna
  window.addEventListener('resize', checkWindowSize);
  checkWindowSize();

  // Debounce funkce
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Optimalizovaná funkce pro vyhledávání
  async function fetchSuggestions(query) {
    // Omezíme vyhledávání na jeden dotaz pro zvýšení rychlosti
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&namedetails=1&limit=10&countrycodes=cz&q=${encodeURIComponent(query)}`;
    
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (err) {
      console.error('Chyba při načítání návrhů:', err);
      return [];
    }
  }

  // Vylepšená funkce pro formátování adres včetně firem
  function formatAddress(item) {
    if (!item.address) return item.display_name;
    
    let parts = [];
    
    // Ulice/název + číslo domu
    if (item.address.road || item.address.street || item.address.neighbourhood) {
      let street = item.address.road || item.address.street || item.address.neighbourhood;
      let houseNumber = item.address.house_number || '';
      if (street && houseNumber) {
        parts.push(`${street} ${houseNumber}`);
      } else if (street) {
        parts.push(street);
      }
    }
    
    // Obec/město
    if (item.address.city || item.address.town || item.address.village || item.address.municipality) {
      parts.push(item.address.city || item.address.town || item.address.village || item.address.municipality);
    }
    
    // PSČ
    if (item.address.postcode) {
      parts.push(item.address.postcode);
    }
    
    // Detekce firmy/POI
    let businessName = '';
    
    // Kontrola všech možných zdrojů názvu firmy/POI
    if (item.namedetails && item.namedetails.name) {
      businessName = item.namedetails.name;
    } else if (item.name) {
      businessName = item.name;
    } else if (item.type === 'amenity' || item.type === 'shop' || item.type === 'office') {
      businessName = item.display_name.split(',')[0].trim();
    } else if (item.address && (item.address.amenity || item.address.shop || item.address.office)) {
      businessName = item.address.amenity || item.address.shop || item.address.office;
    }
    
    // Formátovaná adresa
    const formattedAddress = parts.join(', ');
    
    // Pokud jde o firmu, přidáme název firmy před adresu
    if (businessName && !parts.some(part => part.includes(businessName))) {
      return `${businessName}, ${formattedAddress}`;
    }
    
    // Jinak vrátíme jen adresu
    return formattedAddress;
  }

  // Upravená funkce pro zobrazení našeptávače
  async function showSuggestions(inputElem, suggestionElem) {
    const query = inputElem.value.trim();
    if (!query || query.length < 2) {
      suggestionElem.innerHTML = '';
      suggestionElem.classList.remove('active');
      return;
    }
    
    // Zobrazení našeptávače
    suggestionElem.classList.add('active');
    
    // Přidáme indikátor načítání
    suggestionElem.innerHTML = '<li style="text-align:center;font-style:italic;">Vyhledávám...</li>';
    
    // Získáme data z Nominatim API
    const suggestions = await fetchSuggestions(query);
    suggestionElem.innerHTML = '';
    
    if (suggestions.length === 0) {
      // Zobrazíme odkaz na Google Maps pro lepší vyhledávání firem
      const googleUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
      suggestionElem.innerHTML = `
        <li style="text-align:center;font-style:italic;">Žádné výsledky nenalezeny</li>
        <li style="text-align:center;padding:8px;">
          <a href="${googleUrl}" target="_blank" style="color:#2196F3;">
            Hledat v Google Maps
          </a>
        </li>
      `;
      return;
    }
    
    suggestions.forEach(item => {
      const li = document.createElement('li');
      li.textContent = formatAddress(item);
      
      li.addEventListener('click', () => {
        inputElem.value = li.textContent;
        inputElem.dataset.lat = item.lat;
        inputElem.dataset.lon = item.lon;
        suggestionElem.innerHTML = '';
        suggestionElem.classList.remove('active');
      });
      suggestionElem.appendChild(li);
    });
  }

  // Inicializace vyhledávacích vstupů
  const startInput = document.getElementById('start');
  const endInput = document.getElementById('end');
  const startSuggestions = document.getElementById('start-suggestions');
  const endSuggestions = document.getElementById('end-suggestions');

  startInput.addEventListener('input', debounce(() => showSuggestions(startInput, startSuggestions), 400));
  endInput.addEventListener('input', debounce(() => showSuggestions(endInput, endSuggestions), 400));

  // Skrytí našeptávače při kliknutí mimo něj
  document.addEventListener('click', function(e) {
    if (!startInput.contains(e.target) && !startSuggestions.contains(e.target)) {
      startSuggestions.classList.remove('active');
    }
    if (!endInput.contains(e.target) && !endSuggestions.contains(e.target)) {
      endSuggestions.classList.remove('active');
    }
  });

  // Dynamické zastávky – vytvoření karty se vstupem pro adresu, fixaci a dobu přestávky
  const stopsContainer = document.getElementById('stops-container');
  function createStopField() {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'stop-field';

    // Label pro adresu
    const labelAddr = document.createElement('label');
    labelAddr.textContent = 'Adresa zastávky:';
    fieldDiv.appendChild(labelAddr);

    // Obal pro adresní input a našeptávač
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'stop-input-wrapper';
    fieldDiv.appendChild(inputWrapper);

    const stopInput = document.createElement('input');
    stopInput.type = 'text';
    stopInput.placeholder = 'např. Brno';
    stopInput.autocomplete = 'off';
    stopInput.spellcheck = false;
    stopInput.className = 'stop-input';
    inputWrapper.appendChild(stopInput);

    const suggestions = document.createElement('ul');
    suggestions.className = 'suggestions';
    inputWrapper.appendChild(suggestions);

    stopInput.addEventListener('input', debounce(() => showSuggestions(stopInput, suggestions), 400));

    // Skrytí našeptávače při kliknutí mimo něj
    document.addEventListener('click', function(e) {
      if (!stopInput.contains(e.target) && !suggestions.contains(e.target)) {
        suggestions.classList.remove('active');
      }
    });

    // Řádek pro fixaci času
    const fixRow = document.createElement('div');
    fixRow.className = 'fix-row';
    
    // Checkbox pro fixaci
    const fixCheckboxLabel = document.createElement('label');
    const fixCheckbox = document.createElement('input');
    fixCheckbox.type = 'checkbox';
    fixCheckbox.id = 'fix-' + Date.now();
    fixCheckboxLabel.appendChild(fixCheckbox);
    fixCheckboxLabel.appendChild(document.createTextNode('Fixovat čas příjezdu'));
    fixRow.appendChild(fixCheckboxLabel);
    
    // Vstup pro fixovaný čas – skrytý, dokud není checkbox zaškrtnutý
    const fixedTimeInput = document.createElement('input');
    fixedTimeInput.type = 'time';
    fixedTimeInput.className = 'fixed-time';
    fixedTimeInput.style.display = 'none';
    fixRow.appendChild(fixedTimeInput);
    
    // Toggle zobrazení fixovaného času
    fixCheckbox.addEventListener('change', function() {
      if (this.checked) {
        fixedTimeInput.style.display = 'block';
      } else {
        fixedTimeInput.style.display = 'none';
        fixedTimeInput.value = '';
      }
    });
    fieldDiv.appendChild(fixRow);

    // Label a vstup pro dobu přestávky
    const labelBreak = document.createElement('label');
    labelBreak.textContent = 'Přestávka (min):';
    fieldDiv.appendChild(labelBreak);

    const breakInput = document.createElement('input');
    breakInput.type = 'number';
    breakInput.value = 30;
    breakInput.min = 0;
    breakInput.className = 'break-time';
    breakInput.placeholder = '30';
    breakInput.title = "Délka přestávky v minutách";
    fieldDiv.appendChild(breakInput);

    // Tlačítko odstranění zastávky
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.className = 'remove-stop';
    removeBtn.title = 'Odstranit zastávku';
    removeBtn.addEventListener('click', () => {
      fieldDiv.remove();
    });
    fieldDiv.appendChild(removeBtn);

    return fieldDiv;
  }

  // Přidání počáteční zastávky a tlačítka pro přidání více zastávek
  stopsContainer.appendChild(createStopField());
  document.getElementById('add-stop').addEventListener('click', () => {
    stopsContainer.appendChild(createStopField());
    
    // Posuneme scrollbar na nově přidanou zastávku
    const newStopField = stopsContainer.lastElementChild;
    newStopField.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // Inicializace mapy
  var map = L.map('map').setView([50.0755, 14.4378], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Geokódování adresy
  async function geocodeAddress(address, inputElem) {
    if (inputElem.dataset.lat && inputElem.dataset.lon) {
      return [parseFloat(inputElem.dataset.lat), parseFloat(inputElem.dataset.lon)];
    }
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(address)}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data && data.length > 0) {
        inputElem.dataset.lat = data[0].lat;
        inputElem.dataset.lon = data[0].lon;
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch (err) {
      console.error('Chyba při geokódování adresy:', err);
    }
    return null;
  }

  // Získání trasy
  async function fetchDrivingRoute(points) {
    const coords = points.map(pt => `${pt[1]},${pt[0]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data && data.routes && data.routes.length > 0) {
        return {
          geometry: data.routes[0].geometry,
          legs: data.routes[0].legs
        };
      } else {
        console.error('Neplatná odpověď z OSRM API', data);
        return null;
      }
    } catch (err) {
      console.error('Chyba při načítání trasy z OSRM API:', err);
      return null;
    }
  }

  // Ukládání aktuální trasy
  let currentRoute = { start: null, stops: [], end: null };
  let currentMarkers = [];
  let currentPolyline = null;

  // Plánování trasy
  document.getElementById('planRoute').addEventListener('click', async () => {
    const departureTimeStr = document.getElementById('departure').value;
    if (!startInput.value || !endInput.value) {
      alert('Zadejte alespoň start a cíl.');
      return;
    }
    if (!departureTimeStr) {
      alert('Zadejte prosím čas odjezdu.');
      return;
    }

    // Zobrazení indikátoru načítání
    const planBtn = document.getElementById('planRoute');
    const originalBtnText = planBtn.innerHTML;
    planBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Plánuji trasu...';
    planBtn.disabled = true;

    try {
      // Geokódování startu a cíle
      const startCoords = await geocodeAddress(startInput.value, startInput);
      const endCoords = await geocodeAddress(endInput.value, endInput);
      if (!startCoords || !endCoords) {
        throw new Error('Nepodařilo se geokódovat zadanou adresu.');
      }
      currentRoute.start = { coords: startCoords, addr: startInput.value };
      currentRoute.end = { coords: endCoords, addr: endInput.value };

      // Zpracování zastávek
      const stopFields = stopsContainer.querySelectorAll('.stop-field');
      currentRoute.stops = [];
      for (let field of stopFields) {
        const stopInput = field.querySelector('.stop-input');
        if (stopInput.value.trim()) {
          const coords = await geocodeAddress(stopInput.value, stopInput);
          const breakInput = field.querySelector('.break-time');
          const breakDuration = parseInt(breakInput.value) || 30;
          const fixCheckbox = field.querySelector('input[type="checkbox"]');
          const fixedTimeInput = field.querySelector('input.fixed-time');
          let fixed = false;
          let fixedTime = "";
          if (fixCheckbox && fixCheckbox.checked && fixedTimeInput.value) {
            fixed = true;
            fixedTime = fixedTimeInput.value;
          }
          if (coords) {
            currentRoute.stops.push({ coords, addr: stopInput.value, break: breakDuration, fixed, fixedTime });
          }
        }
      }

      // Sestavení trasy
      let routePoints = [currentRoute.start.coords];
      currentRoute.stops.forEach(s => routePoints.push(s.coords));
      routePoints.push(currentRoute.end.coords);

      // Vyčištění mapy
      clearMap();

      // Přidání markerů
      addMarker(startCoords, "Start: " + startInput.value, 'start');
      currentRoute.stops.forEach((stop, i) => {
        addMarker(stop.coords, "Zastávka " + (i + 1) + ": " + stop.addr, 'stop');
      });
      addMarker(endCoords, "Cíl: " + endInput.value, 'end');

      // Získání trasy z OSRM API
      const routeData = await fetchDrivingRoute(routePoints);
      if (!routeData) {
        throw new Error('Nepodařilo se načíst trasu z OSRM API.');
      }
      const routeCoords = routeData.geometry.coordinates.map(c => [c[1], c[0]]);
      currentPolyline = L.polyline(routeCoords, { color: 'blue', weight: 5, opacity: 0.7 }).addTo(map);
      
      // Zoom na celou trasu
      const bounds = L.latLngBounds(routeCoords);
      map.fitBounds(bounds, { padding: [50, 50] });

      // Výpočet harmonogramu
      calculateSchedule(routeData, departureTimeStr);

      // Zavřít sidebar na mobilních zařízeních po úspěšném naplánování
      if (window.innerWidth < 992) {
        toggleSidebar();
      }
    } catch (error) {
      alert(error.message || 'Nastala chyba při plánování trasy.');
      console.error(error);
    } finally {
      // Obnovení tlačítka
      planBtn.innerHTML = originalBtnText;
      planBtn.disabled = false;
    }
  });

  // Přidání markeru na mapu
  function addMarker(coords, popupText, type) {
    const markerOptions = {};
    
    // Ikony pro různé typy bodů
    if (type === 'start') {
      markerOptions.icon = L.divIcon({
        className: 'custom-marker start-marker',
        html: '<i class="fas fa-flag-checkered"></i>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      });
    } else if (type === 'end') {
      markerOptions.icon = L.divIcon({
        className: 'custom-marker end-marker',
        html: '<i class="fas fa-map-marker-alt"></i>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      });
    } else {
      markerOptions.icon = L.divIcon({
        className: 'custom-marker stop-marker',
        html: '<i class="fas fa-map-pin"></i>',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24]
      });
    }
    
    const marker = L.marker(coords, markerOptions).addTo(map);
    marker.bindPopup(popupText);
    currentMarkers.push(marker);
    return marker;
  }

  // Vyčištění mapy
  function clearMap() {
    // Odstranění markerů
    currentMarkers.forEach(marker => map.removeLayer(marker));
    currentMarkers = [];
    
    // Odstranění polyline
    if (currentPolyline) {
      map.removeLayer(currentPolyline);
      currentPolyline = null;
    }
  }

  // Výpočet harmonogramu
  function calculateSchedule(routeData, departureTimeStr) {
    let scheduleItems = [];
    let cumulativeDistance = 0;
    let departureTime = new Date();
    const [depH, depM] = departureTimeStr.split(':').map(Number);
    departureTime.setHours(depH, depM, 0, 0);
    
    scheduleItems.push({
      label: "Odjezd ze Start (" + currentRoute.start.addr + ")",
      time: new Date(departureTime),
      segment: "",
      cumulative: "0 km"
    });
    
    let currentTime = new Date(departureTime);
    
    for (let i = 0; i < routeData.legs.length; i++) {
      const leg = routeData.legs[i];
      const travelTimeMs = leg.duration * 1000;
      const legDistanceMeters = leg.distance;
      const legDistanceStr = (legDistanceMeters / 1000).toFixed(1) + " km";
      cumulativeDistance += legDistanceMeters;
      const cumulativeStr = (cumulativeDistance / 1000).toFixed(1) + " km";
      
      // Pokud existuje fixace pro tuto zastávku, použijeme ji
      if (i < currentRoute.stops.length && currentRoute.stops[i].fixed && currentRoute.stops[i].fixedTime) {
        // Převod fixovaného času (HH:MM) na Date (s použitím stejného dne jako odjezd)
        const [fixH, fixM] = currentRoute.stops[i].fixedTime.split(':').map(Number);
        currentTime = new Date(departureTime.getFullYear(), departureTime.getMonth(), departureTime.getDate(), fixH, fixM, 0, 0);
      } else {
        currentTime = new Date(currentTime.getTime() + travelTimeMs);
      }
  
      if (i < currentRoute.stops.length) {
        scheduleItems.push({
          label: "Příjezd do Zastávky " + (i + 1) + " (" + currentRoute.stops[i].addr + ")",
          time: new Date(currentTime),
          segment: legDistanceStr,
          cumulative: cumulativeStr,
          fixed: currentRoute.stops[i].fixed
        });
        const breakMs = currentRoute.stops[i].break * 60 * 1000;
        currentTime = new Date(currentTime.getTime() + breakMs);
        scheduleItems.push({
          label: "Odjezd ze Zastávky " + (i + 1) + " (" + currentRoute.stops[i].addr + ")",
          time: new Date(currentTime),
          segment: "",
          cumulative: cumulativeStr
        });
      } else {
        scheduleItems.push({
          label: "Příjezd do Cíle (" + currentRoute.end.addr + ")",
          time: new Date(currentTime),
          segment: legDistanceStr,
          cumulative: cumulativeStr
        });
      }
    }
  
    // Generování harmonogramu
    generateSchedule(scheduleItems);
  }
  
  // Generování harmonogramu
  function generateSchedule(scheduleItems) {
    const scheduleBody = document.getElementById("schedule-body");
    scheduleBody.innerHTML = "";
    
    scheduleItems.forEach((item, index) => {
      const row = document.createElement('tr');
      const h = item.time.getHours().toString().padStart(2, '0');
      const m = item.time.getMinutes().toString().padStart(2, '0');
      
      // Určení typu řádku pro vizuální odlišení
      if (item.label.includes("Odjezd ze Start")) {
        row.className = "departure";
      } else if (item.label.includes("Odjezd ze Zastávky")) {
        row.className = "departure";
      } else if (item.label.includes("Příjezd do Cíle")) {
        row.className = "final-arrival";
      } else if (item.label.includes("Příjezd do Zastávky")) {
        row.className = "arrival";
        
        // Kontrola jestli je zastávka s fixovaným časem
        if (item.fixed) {
          row.className += " fixed-time";
        }
      }
      
      row.innerHTML = `
        <td>${item.label}</td>
        <td>${h}:${m}</td>
        <td>${item.segment}</td>
        <td>${item.cumulative}</td>
      `;
      scheduleBody.appendChild(row);
    });
    
    // Zobrazení harmonogramu a export tlačítek
    document.getElementById("schedule").style.display = "block";
    document.getElementById('export-buttons').style.display = 'flex';
  }
  
  // Export do Google Maps
  document.getElementById('export-google').addEventListener('click', () => {
    if (!currentRoute.start || !currentRoute.end) return;
    const s = currentRoute.start.coords;
    const e = currentRoute.end.coords;
    let googleUrl = `https://www.google.com/maps/dir/?api=1&origin=${s[0]},${s[1]}&destination=${e[0]},${e[1]}`;
    if (currentRoute.stops.length > 0) {
      const waypoints = currentRoute.stops.map(stop => `${stop.coords[0]},${stop.coords[1]}`).join('|');
      googleUrl += `&waypoints=${encodeURIComponent(waypoints)}`;
    }
    window.open(googleUrl, '_blank');
  });
  
  // Funkce pro tisk harmonogramu
  function printSchedule() {
    window.print();
  }

  // Funkce pro kopírování harmonogramu do schránky
  function copyScheduleToClipboard() {
    const scheduleTable = document.querySelector('.schedule-container');
    const rows = scheduleTable.querySelectorAll('tbody tr');
    let textContent = "ČASOVÝ HARMONOGRAM CESTY\n\n";
    
    rows.forEach(row => {
      const columns = row.querySelectorAll('td');
      textContent += `${columns[0].textContent} - ${columns[1].textContent}`;
      
      if (columns[2].textContent.trim() !== '') {
        textContent += ` (${columns[2].textContent})`;
      }
      
      textContent += `\nCelková vzdálenost: ${columns[3].textContent}\n\n`;
    });
    
    const copyContent = document.getElementById('copy-content');
    copyContent.value = textContent;
    copyContent.select();
    document.execCommand('copy');
    
    // Notifikace o zkopírování
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = 'Harmonogram byl zkopírován do schránky!';
    document.body.appendChild(notification);
    
    // Automaticky zmizí po 3 sekundách
    setTimeout(() => {
      notification.classList.add('hide');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Funkce pro export do PDF
  function exportScheduleToPDF() {
    // Zde by byla implementace exportu do PDF
    // Pro plnou implementaci by bylo potřeba přidat knihovnu jako jspdf
    alert('Pro export do PDF je potřeba přidat knihovnu jsPDF. Zatím prosím použijte tisk do PDF.');
  }

  // Přidání posluchačů událostí
  document.getElementById('print-schedule').addEventListener('click', printSchedule);
  document.getElementById('copy-schedule').addEventListener('click', copyScheduleToClipboard);
  document.getElementById('export-schedule-pdf').addEventListener('click', exportScheduleToPDF);

  // Přidání CSS pro notifikaci
  const notificationStyle = document.createElement('style');
  notificationStyle.textContent = `
    .notification {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: var(--success-color);
      color: white;
      padding: 10px 20px;
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      z-index: 1500;
      opacity: 1;
      transition: opacity 0.3s ease;
    }
    .notification.hide {
      opacity: 0;
    }
    
    /* Styl pro vlastní markery */
    .custom-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.25rem;
    }
    
    .start-marker i {
      color: var(--success-color);
      text-shadow: 0 0 3px rgba(0,0,0,0.5);
      font-size: 1.5rem;
    }
    
    .end-marker i {
      color: var(--danger-color);
      text-shadow: 0 0 3px rgba(0,0,0,0.5);
      font-size: 1.75rem;
    }
    
    .stop-marker i {
      color: var(--primary-color);
      text-shadow: 0 0 3px rgba(0,0,0,0.5);
      font-size: 1.25rem;
    }
  `;
  document.head.appendChild(notificationStyle);
});
