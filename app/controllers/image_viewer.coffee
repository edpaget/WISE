{Controller} = require 'spine'
Timeline = require 'controllers/timeline'
Info = require 'controllers/info'

class ImageViewer extends Controller
  events:
    'click button.play' : 'play'
    'click button.stop' : 'stop'

  wavelengths: [
    'dssdss2blue',
    'dssdss2red',
    'dssdss2ir',
    '2massj',
    '2massh',
    '2massk',
    'wise1',
    'wise2',
    'wise3',
    'wise4'
  ]

  circleLengths: [
    '2massj',
    '2massh',
    '2massk',
    'wise1',
    'wise2',
    'wise3',
    'wise4'
  ]

  circleRadius: 34

  constructor: ->
    super
    @index = 0

    @timeline = new Timeline {el: '.timeline'}
    @timeline.on 'scrub', @goTo

    @info = new Info {el: ".info"}
    @setupCanvas()

  setupCanvas: ->
    @canvas = document.getElementById('viewer')
    @ctx = @canvas.getContext('2d')
    @ctx.lineWidth = 2
    @ctx.strokeStyle = 'red'

  preloadImages: (subject) =>
    @images = []
    loadedImages = 0
    promise = new $.Deferred()

    inc = =>
      loadedImages = loadedImages + 1
      if (loadedImages is subject.metadata.files.length)
        promise.resolve()

    for source in @subjectWavelengths(subject) 
      img = new Image
      img.src = source.src
      img.onload = inc
      @images.push {img: img, wavelength: source.wavelength}

    return promise

  subjectWavelengths: (subject) =>
    srcs = []
    for wavelength in @wavelengths when subject.location[wavelength]?
      srcs.push {src: subject.location[wavelength], wavelength: wavelength}
    srcs

  drawImage: =>
    img = @images[@index]
    @ctx.clearRect(0, 0, @canvas.width, @canvas.height)
    @ctx.drawImage(img.img, 0, 0, @canvas.width, @canvas.height)
    @drawCircle() if img.wavelength in @circleLengths

  drawCircle: =>
    @ctx.beginPath()
    @ctx.arc(@canvas.width / 2, @canvas.height / 2, 
            @circleRadius, 0, Math.PI*2, true)
    @ctx.closePath()
    @ctx.stroke()

  animate: =>
    if @animateImages
      if @index + 1 >= @images.length 
        @stop()
        @trigger 'played'
      else 
        @index = @index + 1
      @drawImage()
      @timeline.updateTimeline()
      setTimeout(@animate, 500)

  stop: =>
    @$('button.stop').text('play').removeClass('stop').addClass('play')
    @animateImages = false

  play: (e) =>
    @index = -1 if @index + 1 >= @images.length
    @$('button.play').text('stop').removeClass('play').addClass('stop')
    @animateImages = true
    @animate()

  goTo: (index) =>
    @index = index
    @drawImage()

  activateControls: =>
    @$('button.play').removeAttr 'disabled'
    @$('input[type="range"]').removeAttr 'disabled'

  deactivateControls: =>
    @$('button.play').attr 'disabled', 'disabled'
    @$('input[type="range"]').attr 'disabled', 'disabled'

  setupSubject: (subject) =>
    return if !subject
    @deactivateControls()
    @$('input[type="range"]').val 0
    @info.setupSubject(subject)

    @preloadImages(subject).then(@postloadImages)

  postloadImages: =>
    @$('.loading').hide()
    @activateControls()
    @timeline.render(@images)
    @drawImage()

module.exports = ImageViewer
