var PIXI = require('pixi.js')
var { AdjustmentFilter, ConvolutionFilter, KawaseBlurFilter } = require('pixi-filters')

var W = window.innerWidth

var zoom = {
    zoomValue: 20,
    isZoom: false
}

var radiusCircleBlur = 50

var mousedown = {
    allowBlur: false,
    eventX: 0,
    eventY: 0
};
var pixi_canvas
var containerBG
var containerBlur
var filters = {
    filterSharpen: {},
    filterAdjustment: {},
    filterBlur: {}
}

var selection = {
    rect: new PIXI.Graphics(),
    width: 0,
    height: 0,
    x: 0,
    y: 0
}

var navigation = {
    current: 0,
    isBackOrNext: false,
    effects: [
        {
            blur: null,
            brightness: 1,
            improve: {
                sharpen: ["init"],
                contrast: 1,
                saturation: 1
            },
            red: 1,
            green: 1,
            blue: 1
        }
    ],
    storeEffects: [],

    pushNavArray: function(effectName, effectValue, lastEffect) {
        navigation.effects.push({
            blur: effectName == "blur" ? effectValue : lastEffect.blur,
            brightness:  effectName == "brightness" ? effectValue : lastEffect.brightness,
            improve: effectName == "improve" ? effectValue : lastEffect.improve,
            red:  effectName == "red" ? effectValue : lastEffect.red,
            green: effectName == "green" ? effectValue : lastEffect.green,
            blue:  effectName == "blue" ? effectValue : lastEffect.blue
        })
    }
}

var mode = "circle"

$(document).ready(function() {
    showFPS()
   
    slider.set('#circleSize', 29, 128)
    slider.set('#brightness', 29, 128)
    slider.set('#improve', 29, 128)
    slider.set('#red', 1, 5)
    slider.set('#green' , 1, 5)
    slider.set('#blue' , 1, 5)

    initDOMValues()

    pixi_plugin.createCanvas()

    $(".container_rect").on("click", btns_events.circleCheckbox)
    $(".container_circle").on("click", btns_events.rectCheckbox)
    $("#back").on('click', btns_events.backBtn)
    $("#next").on('click', btns_events.nextBtn)
    $("#cancel").on('click', btns_events.cancelBtn)
    
})

var canvasEvents = {
    /**
     * Zoomer ou dezoomer dans le canvas
     * @param {Object} e event
     */
    toggleZoom: function(e) {
  
        var e = window.event || e; // old IE support
        var delta = Math.max( -1, Math.min( 1, ( e.wheelDelta || -e.detail ) ) );


        if ( delta == 1 ) {
            if(!zoom.isZoom) {
                zoom.isZoom = true
                zoom.zoomValue = 50
                var scale = zoom.zoomValue / 100;
                $('#canvas').css("transform", "scale(" + scale + ", " + scale + ") translate(" + -e.pageX * 2 + "px, " + -e.pageY * 2 + "px)")
            }
        } else {
            if(zoom.isZoom) {
                zoom.isZoom = false
                zoom.zoomValue = 20
                var scale = zoom.zoomValue / 100;
                $('#canvas').css("transform", "scale(" + scale + ", " + scale + ") translate(0px, 0px)")

            }
        }

        $('#zoom-value').text(zoom.zoomValue)
    
    },

    /**
     * Mousedown sur le canvas principal
     * @param {Object} e event
     */
    handlerMousedown: function(e) {
        mousedown.allowBlur = true

        if(mode == "circle") canvasEvents.circleMousedown(e)
        else canvasEvents.rectMousedown(e)
    },

    /**
     * Mousedown sur le canvas principal en mode cercle
     * @param {Object} e event
     */
    circleMousedown: function(e) {

        // 200 = size of left menu
        // 38 = margin beetween top of document and canvas
        // 50 = size of blur radius
        blur_tools.drawCircle(e.data.global.x, e.data.global.y)

        var lastEffect = version.getLastEffectForBlur()
        var effectValue = { type: "down", x: e.data.global.x, y: e.data.global.y }

        navigation.pushNavArray("blur", effectValue, lastEffect)

        console.log(navigation)

    },

    /**
     * Mousedown sur le canvas principal en mode rectangle
     * @param {Object} e event
     */
    rectMousedown: function(e) {
        mousedown.eventX = e.data.global.x
        mousedown.eventY = e.data.global.y
    },
    
    /**
     * Mousemove sur le canvas principal
     * @param {Object} e event
     */
    handlerMousemove: function(e) {
        if(mode == "circle") canvasEvents.circleMousemove(e)
        else canvasEvents.rectMousemove(e)
    },

    /**
     * Mousemove sur le canvas principal en mode cercle
     * @param {Object} e event
     */
    circleMousemove: function(e) {
        if(mousedown.allowBlur) {
            // 200 = size of left menu
            // 38 = margin beetween top of document and canvas
            // 50 = size of blur radius
            blur_tools.drawCircle(e.data.global.x, e.data.global.y)

            var lastEffect = version.getLastEffectForBlur()
            var effectValue = { type: "move", x: e.data.global.x, y: e.data.global.y }

            navigation.pushNavArray("blur", effectValue, lastEffect)
        }
    },

    /**
     * Mousemove sur le canvas principal en mode rectangle
     * @param {Object} e event
     */
    rectMousemove: function(e) {
        if(mousedown.allowBlur) {  

            selectionPosition(e)

            selection.width = mousedown.eventX - selection.x;
            selection.height = mousedown.eventY - selection.y;

            // Remove rect
            selection.rect.clear();

            selection.rect.drawRect(selection.x, selection.y, selection.width, selection.height);
            
        }
    },

    /**
     * Mouseup sur le canvas principal
     * @param {Object} e event
     */
    handlerMouseup: function(e) {
        mousedown.allowBlur = false
        if(mode == "rectangle") canvasEvents.rectMouseup(e) 
    },

    /**
     * Mouseup sur le canvas principal en mode rectangle
     * @param {Object} e event
     */
    rectMouseup: function(e) {
        blur_tools.drawRect()
        selection.rect.clear();
    },

}

var pixi_plugin = {
    /**
     * Création d'un canvas avec PIXI
     */
    createCanvas: function() {
        pixi_canvas = new PIXI.Application({
            width: 5376,
            height: 2688,
            backgroundColor: 0x1099bb,
        });

        pixi_plugin.initFilters()

        pixi_canvas.stage.interactive = true;

        document.getElementById('container').appendChild(pixi_canvas.view)

        $("canvas").attr("id", "canvas")

        containerBG = new PIXI.Container();
        containerBlur = new PIXI.Container();

        var bg = pixi_plugin.createSprite("bunny.jpg", true, [filters.filterSharpen, filters.filterAdjustment]);
        var bgBlured = pixi_plugin.createSprite("bunny.jpg", false, [filters.filterSharpen, filters.filterBlur, filters.filterAdjustment]);

        pixi_canvas.stage.addChild(containerBG);
        pixi_canvas.stage.addChild(containerBlur);
        pixi_canvas.stage.addChild(selection.rect);
        selection.rect.lineStyle(5, 0xffffff);
        bgBlured.mask = containerBlur;

        document.getElementById("canvas").addEventListener('DOMMouseScroll', function(e) { canvasEvents.toggleZoom(e) } );
        document.getElementById("canvas").addEventListener('mousewheel', function(e) { canvasEvents.toggleZoom(e) } );

        bg.on('pointerdown', canvasEvents.handlerMousedown)
          .on('pointerup', canvasEvents.handlerMouseup)
          .on('pointermove', canvasEvents.handlerMousemove);
    },

    /**
     * Création d'un sprite avec les différents filtres (sharpen etc)
     * @param {Object} from image
     * @param {boolean} interactive Permet d'associer un event ou non
     * @param {Object} filtersSprite Ajouter des filtres au sprite
     */
    createSprite: function(from, interactive, filtersSprite) {
        var sprite = new PIXI.Sprite.from(from);
        sprite.filters = filtersSprite
        if(interactive) sprite.interactive = true;
        containerBG.addChild(sprite);

        return sprite;
    },

    /**
     * Initialiser les filtres
     */
    initFilters: function() {
        filters.filterSharpen = new ConvolutionFilter()
        filters.filterAdjustment = new AdjustmentFilter()
        filters.filterBlur = new KawaseBlurFilter()
        pixi_plugin.setSharpen("init")
        pixi_plugin.setBlur(12, 5)
    },

    /**
     * Modifier filtre netteté
     * @param {Array} matrix defaut : [0,0,0,0,1,0,0,0,0]
     * @param {Number} width 
     * @param {Number} height
     */
    setSharpen: function(matrix, width, height) {

        if(width == undefined) filters.filterSharpen.width = 2000 / (5376/ 80)
        else filters.filterSharpen.width = 2000 / (width / 80)
        if(height == undefined) height = 2000 / (2688 / 80)
        else filters.filterSharpen.height = 2000 / (height / 80)
        
        if(matrix == "init") {
            filters.filterSharpen.matrix = [0,0,0,0,1,0,0,0,0];
        } else {
            filters.filterSharpen.matrix = [0,-1,0,-1,5,-1,0,-1,0];
        }
            

    },

    /**
     * Modifier filtre flou
     */
    setBlur: function() {
        filters.filterBlur.blur = 12
        filters.filterBlur.quality = 5
    },

    /**
     * Modifier filtre rouge du RGB
     * @param {Number} value entre 1 - 5
     */
    setRedColor: function(value) {
        filters.filterAdjustment.red = 1 + value / 20
    },

    /**
     * Modifier filtre vert du RGB
     * @param {Number} value entre 1 - 5
     */
    setGreenColor: function(value) {
        filters.filterAdjustment.green = 1 + value / 20
    },

    /**
     * Modifier filtre bleu du RGB
     * @param {Number} value entre 1 - 5
     */
    setBlueColor: function(value) {
        filters.filterAdjustment.blue = 1 + value / 20
    },

    /**
     * Modifier filtre luminosite
     * @param {Number} value entre 1 - 5
     */
    setBrightness: function(value) {
        filters.filterAdjustment.brightness = 1 + value / 800
    },

    /**
     * Modifier filtre contraste
     * @param {Number} value entre 1 - 5
     */
    setContrast: function(value) {
        filters.filterAdjustment.contrast = 1 + value / 800
    },

    /**
     * Modifier filtre staturation
     * @param {Number} value entre 1 - 5
     */
    setSaturation: function(value) {
        filters.filterAdjustment.saturation = 1 + value / 800
    },
}

var blur_tools = {
    /**
     * Dessiner un cercle
     * @param {Number} x coordonnee x
     * @param {Number} y coordonnee y
     */
    drawCircle: function(x, y){
        var brushBlur = new PIXI.Graphics();
        brushBlur.beginFill(0x000000, 1);
        //brushBlur.drawCircle(x, y, radiusCircleBlur);
        brushBlur.drawCircle(x, y, 150);
        brushBlur.lineStyle(0);
        brushBlur.endFill();
        containerBlur.addChild(brushBlur)
    },

    /**
     * Dessiner un rectangle
     */
    drawRect: function(){

        var brushBlur = new PIXI.Graphics();
        brushBlur.beginFill(0x000000, 1);
        brushBlur.drawRect(selection.x, selection.y, selection.width, selection.height);
        brushBlur.lineStyle(0);
        brushBlur.endFill();
        containerBlur.addChild(brushBlur)
    },
}

var btns_events = {
    /**
     * Click sur la checkbox "cercle"
     */
    circleCheckbox: function() {
        mode = "circle"
    },

    /**
     * Click sur la checkbox "rectangle"
     */
    rectCheckbox: function() {
        mode = "rectangle"
    },

    /**
     * Click sur le bouton "Back"
     */
    backBtn: function() {
        navigation.isBackOrNext = true
        version.backVersion()
    },

    /**
     * Click sur le bouton "Next"
     */
    nextBtn: function() {
        navigation.isBackOrNext = true
        version.nextVersion()
    },

    /**
     * Click sur le bouton "Cancel"
     */
    cancelBtn: function() {
        navigation.current = 0
        version.cancel()
    }
}

var slider = {
    /**
     * Initialiser slider
     * 
     * @param {String} id id de la div
     * @param {Nember} min valeur min
     * @param {Nember} max valeur max
     * 
     */
    set: function(id, min, max) {
        $(id).slider({
            max: max,
            min: min,
            value: 0,
            range: "min",
            orientation: "horizontale",
            create: function(t, e) {
            },
            slide: function(t, e) {
                slider.slide(t, e, id, this)
            },
            stop: function(t, e) {
                slider.stop(t, e, id)
            }
        });
    },

    /**
     * Event slide slider
     * 
     * @param {Object} t
     * @param {Object} e event
     * @param {String} id id de la div
     * @param {Object} this instance du slide
     * 
     */
    slide: function(t, e, id, self) {
        $(self).find("span").text( e.value - 28 );
    
        switch(id) {
            case "#circleSize":

                $(self).find("span").text( e.value - 28 );

                break;
    
            case "#brightness":

                $(self).find("span").text( e.value - 28 );
                pixi_plugin.setBrightness(e.value - 28)

                break;
    
            case "#improve":

                $(self).find("span").text( e.value - 28 );
                pixi_plugin.setContrast(e.value - 28)
                pixi_plugin.setSaturation(e.value - 28)
                pixi_plugin.setSharpen("sharpen", e.value - 28, e.value - 28)

                break;
            
            case "#red":
    
                $(self).find("span").text( e.value );
                pixi_plugin.setRedColor(e.value)
    
                break;
    
            case "#green":
    
                $(self).find("span").text( e.value );
                pixi_plugin.setGreenColor(e.value)
    
                break;
            
            case "#blue":
    
                $(self).find("span").text( e.value );
                pixi_plugin.setBlueColor(e.value)
    
                break;
    
        }
    },

    /**
     * Event stop slider
     * 
     * @param {Object} t
     * @param {Object} e event
     * @param {String} id id de la div
     * 
     */
    stop: function(t, e, id) {
        switch(id) {
            case "#circleSize":
                radiusCircleBlur = e.value - 28
                break;
    
            case "#brightness":
                
                navigation.current++

                if (navigation.isBackOrNext) {
                    navigation.storeEffects = []
                    navigation.isBackOrNext = false;
                }

                navigation.pushNavArray("brightness", e.value - 28, getDOMEffectsVal())
    
                console.log(navigation.current)
                console.log(navigation.effects)
    
                break;
    
            case "#improve":
    
                navigation.current++

                if (navigation.isBackOrNext) {
                    navigation.storeEffects = []
                    navigation.isBackOrNext = false;
                }

                var improve = {
                    sharpen: ["sharpen", e.value - 28, e.value - 28],
                    contrast: e.value - 28,
                    saturation: e.value - 28
                }

                navigation.pushNavArray("improve", improve, getDOMEffectsVal())

    
                console.log(navigation.current)
                console.log(navigation.effects)
    
                break;
            
            case "#red":
    
                navigation.current++
    
                if (navigation.isBackOrNext) {
                    navigation.storeEffects = []
                    navigation.isBackOrNext = false;
                }
    
                navigation.pushNavArray("red", e.value, getDOMEffectsVal())
    
                console.log(navigation.current)
    
                break;
    
            case "#green":
    
                navigation.current++
                
                if (navigation.isBackOrNext) {
                    navigation.storeEffects = []
                    navigation.isBackOrNext = false;
                }
    
                navigation.pushNavArray("green", e.value, getDOMEffectsVal())

                console.log(navigation.current)
    
                break;
            
            case "#blue":

                navigation.current++
    
                if (navigation.isBackOrNext) {
                    navigation.storeEffects = []
                    navigation.isBackOrNext = false;
                }
    
                navigation.pushNavArray("blue", e.value, getDOMEffectsVal())
    
                console.log(navigation.effects)
                console.log(navigation.current)
    
                break;
    
        }
    }
}

var version = {
    getLastEffectForBlur: function() {
        navigation.current++

        if (!navigation.isBackOrNext) return navigation.effects[navigation.effects.length - 1]
        else {
    
            navigation.storeEffects = []
            isBackOrNext = false;
    
            return navigation.effects[navigation.effects.length - 1]
        }
    },

    /**
     * Revenir a la version précédente
     */
    backVersion: function() {

        console.log(navigation.effects)

        if(navigation.current < 0) {
            navigation.current = 0
            return;
        }
    
        var effects = navigation.effects[navigation.current]

        // Suppression des blur
        if(effects.blur != null) {
            if(effects.blur.type != undefined && effects.blur.type == "down") {

                containerBlur.removeChildAt(containerBlur.children.length - 1)
                navigation.effects = navigation.effects.splice(0, navigation.current)
                navigation.storeEffects.push(effects)
                navigation.current = navigation.effects.length - 1


            } else if(effects.blur.type != undefined && effects.blur.type == "move") {
                
                for(var i = 0; i < navigation.current; i++) {
                    
                    var array = navigation.effects[navigation.current - i]
                    containerBlur.removeChildAt(containerBlur.children.length - 1)
                    navigation.storeEffects.push(array)

                    if(array.blur != undefined && array.blur.type == "down") break;
    
                }

                navigation.effects = navigation.effects.splice(0, navigation.current - i)
                navigation.current = navigation.effects.length - 1

            }
        } else {
            navigation.effects = navigation.effects.splice(0, navigation.current)
            navigation.storeEffects.push(effects)
            navigation.current = navigation.effects.length - 1 
        }

        effects = navigation.effects[navigation.current]

        // Mettre les effets précédents
        pixi_plugin.setBrightness(effects.brightness)
        pixi_plugin.setContrast(effects.improve.contrast)
        pixi_plugin.setSaturation(effects.improve.saturation)
        pixi_plugin.setSharpen(effects.improve.sharpen[0], effects.improve.sharpen[1], effects.improve.sharpen[2])
        pixi_plugin.setRedColor(effects.red)
        pixi_plugin.setGreenColor(effects.green)
        pixi_plugin.setBlueColor(effects.blue)
    
        version.DOMVersionSlider(effects)
    
    },

    /**
     * Revenir a la version suivante
     */
    nextVersion: function() {
    
        if(navigation.current > navigation.effects.length) {
            navigation.current = navigation.effects.length - 1
            return;
        }

        /*console.log(navigation.current)
        console.log(navigation.effects)*/
    
        var effects = navigation.storeEffects[0]

        //console.log(effects)

        // Ajout des blur
        if(effects.blur != null) {
            if(effects.blur.type != undefined && effects.blur.type == "down") {
                blur_tools.drawCircle(effects.blur.x, effects.blur.y)

                navigation.effects.push(navigation.storeEffects[0])
                navigation.storeEffects = navigation.storeEffects.splice(0, 1)
                navigation.current = navigation.effects.length - 1


            } else if(effects.blur.type != undefined && effects.blur.type == "move") {
                
                for(var i = 0; i < navigation.storeEffects.length; i++) {
                    
                    var array = navigation.storeEffects[i]
                    blur_tools.drawCircle(array.blur.x, array.blur.y)
                    navigation.effects.push(array)

                    if(array.blur != undefined && array.blur.type == "down") break;
    
                }

                navigation.storeEffects = navigation.storeEffects.splice(i)
                navigation.current = navigation.effects.length - 1

                console.log(i)
                console.log(navigation.effects)
                console.log(navigation.storeEffects)

            }
        } else {
            navigation.effects.push(navigation.storeEffects[0])
            navigation.storeEffects = navigation.storeEffects.splice(0, 1)
            navigation.current = navigation.effects.length - 1
        }

        effects = navigation.effects[navigation.current]
        
        // Mettre les effets suivants
        pixi_plugin.setBrightness(effects.brightness)
        pixi_plugin.setContrast(effects.improve.contrast)
        pixi_plugin.setSaturation(effects.improve.saturation)
        pixi_plugin.setSharpen(effects.improve.sharpen[0], effects.improve.sharpen[1], effects.improve.sharpen[2])
        pixi_plugin.setRedColor(effects.red)
        pixi_plugin.setGreenColor(effects.green)
        pixi_plugin.setBlueColor(effects.blue)
    
        version.DOMVersionSlider(effects)
    
    },

    /**
     * Revenir a la première version
     */
    cancel: function() {
        
        // Mettre les effets par defauts
        pixi_plugin.setBrightness(1)
        pixi_plugin.setContrast(1)
        pixi_plugin.setSaturation(1)
        pixi_plugin.setSharpen("init")
        pixi_plugin.setRedColor(1)
        pixi_plugin.setGreenColor(1)
        pixi_plugin.setBlueColor(1)
    
        var defaut = {
            blur: {},
            brightness: 1,
            improve: {
                sharpen: ["init"],
                contrast: 1,
                saturation: 1
            },
            red: 1,
            green: 1,
            blue: 1
        }
    
        version.DOMVersionSlider(defaut)
        containerBlur.removeChildren()

        navigation.effects = navigation.effects.splice(0, 1)

        console.log(navigation.effects)
    
    },
    
    /**
     * Changer les valeurs du DOM en fonction de la version
     * 
     * @param {Object} effects Contient tous les effets
     */
    DOMVersionSlider: function(effects) {

        var brightness = version.limit(effects.brightness, 1)
        var improve = version.limit(effects.improve.contrast, 1)
        var red = version.limit(effects.red, 1)
        var green = version.limit(effects.green, 1)
        var blue = version.limit(effects.blue, 1)

        $("#circleSize span").text(radiusCircleBlur)
    
        setDOMValues("#brightness", brightness)
        setDOMValues("#improve", improve)
        setDOMValues("#red", red)
        setDOMValues("#green", green)
        setDOMValues("#blue", blue)
    
    },

    /**
     * Si le nombre number est égale a limitNumber alors on retourne 0
     * @param {Number} number 
     * @param {Number} limitNumber 
     */
    limit: function(number, limitNumber) {
        if(number == limitNumber) {
            return {
                DOMValue: 1,
                width: 0,
                left: 0
            }
        }

        return {
            DOMValue: number,
            width: number,
            left: number
        }
    }
}

/**
 * Initialiser les valeurs du DOM
 */
function initDOMValues() {
    $("#circleSize span").text("50")
    $("#circleSize span").css("left", "50%")
    $("#circleSize .ui-slider-range").css("width", "50%")

    $("#brightness span, #improve span").text("1")
    $("#red span, #green span, #blue span").text("1")
}

/**
 * Definir la position de la selection en mode rectangle
 */
function selectionPosition(e) {
    if(e.data.global.x < mousedown.eventX) selection.x = e.data.global.x;
    else selection.x = e.data.global.x;

    if(e.data.global.y < mousedown.eventY) selection.y = e.data.global.y;
    else selection.y = e.data.global.y;
}

/**
 * Afficher FPS
 */
function showFPS() {
    var overlay, lastCount, lastTime, timeoutFun;

    overlay = document.createElement('div');
    overlay.style.background = 'rgba(0, 0, 0, .7)';
    overlay.style.top = '0';
    overlay.style.color = '#fff';
    overlay.style.display = 'inline-block';
    overlay.style.fontFamily = 'Arial';
    overlay.style.fontSize = '10px';
    overlay.style.lineHeight = '12px';
    overlay.style.padding = '5px 8px';
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.zIndex = '1000000';
    overlay.innerHTML = 'FPS: -';
    document.body.appendChild(overlay);

    lastCount = window.mozPaintCount;
    lastTime = performance.now();

    timeoutFun = function () {
        var curCount, curTime;

        curCount = window.mozPaintCount;
        curTime = performance.now();
        overlay.innerHTML = 'FPS: ' + ((curCount - lastCount) / (curTime - lastTime) * 1000).toFixed(2);
        lastCount = curCount;
        lastTime = curTime;
        setTimeout(timeoutFun, 1000);
    };

    setTimeout(timeoutFun, 1000);

}

/**
 * Récupérer les valeurs du DOM
 */
function getDOMEffectsVal() {
    var sharpen = ["init"]
    var improveVal = $("#improve").text()

    if(improveVal > 1) {
        sharpen = ["sharpen", improveVal, improveVal]
    }

    return {
        blur: null,
        brightness: $("#brightness").text(),
        improve: {
            sharpen: sharpen,
            contrast: improveVal,
            saturation: improveVal
        },
        red: $("#red").text(),
        green: $("#green").text(),
        blue: $("#blue").text()
    }
}
/**
 * Changer les valeurs du DOM
 * 
 * @param {string} id avec le # devant (exemple : #red)
 * @param {object} css contient valeur du text, la taille et la position
 */
function setDOMValues(id, css) {

    if(id == "#red" || id == "#green" || id == "#blue") {
        css.left = css.left * 20
        css.width = css.width * 20
    }

    $(id + " span").text(css.DOMValue)
    $(id + " span").css("left", css.left + "%")
    $(id + " .ui-slider-range").css("width", css.width + "%")
}