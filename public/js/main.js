const CHART = document.getElementById('lineChart')

let lineChart = new Chart(CHART, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Memory in MB',
      data: [],
      backgroundColor: [
        'rgba(255, 159, 64, 0.2)',
        'rgba(54, 162, 235, 0.2)',
        'rgba(255, 206, 86, 0.2)',
        'rgba(75, 192, 192, 0.2)',
        'rgba(153, 102, 255, 0.2)'
      ],
      borderColor: [
        'rgba(255, 159, 64, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)'
      ],
      borderWidth: 1
    }]
  },
  options: {
    scales: {
      yAxes: [{
        ticks: {
          beginAtZero: false
        }
      }]
    }
  }
})

socket.on('memory', function (data) {
  if (lineChart.data.datasets[0].data.length >= 12) {
    lineChart.data.datasets[0].data.shift()
    lineChart.data.labels.shift()
  }
  let xAxis = ''
  lineChart.data.datasets[0].data.push(parseInt((data[0].monit.memory / 1024) / 1024))
  lineChart.data.labels.push(xAxis)
  lineChart.update()
})
