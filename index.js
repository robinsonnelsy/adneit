/// <reference path="babylon.d.ts" />
var engine;
var assetUrl;
//="https://unonubesdiez.github.io/oniva15/avf15.glb";
var cameraPosition;
var kiosk;
var currentGroup; // animation group
var currentGroupIndex;
var currentScene;
// html tags
var footer = document.getElementById("footer");
var canvas = document.getElementById("renderCanvas");
var canvasZone = document.getElementById("canvasZone");

// Check URL
var indexOf = location.href.indexOf("?");
if (indexOf !== -1) {
    var params = location.href.substr(indexOf + 1).split("&");
    for (var index = 0; index < params.length; index++) {
        var param = params[index].split("=");
        var name = param[0];
        var value = param[1];
        switch (name) {
            case "assetUrl": {
                assetUrl = value;
                break;
            }
            case "cameraPosition": {
                cameraPosition = BABYLON.Vector3.FromArray(value.split(",").map(function(component) { return +component; }));
                break;
            }
            case "kiosk": {
                kiosk = value === "true" ? true : false;
                break;
            }
        }
    }
}

if (kiosk) {
    footer.style.display = "none";
    canvasZone.style.height = "100%";
}

if (BABYLON.Engine.isSupported()) {
   engine = new BABYLON.Engine(canvas, true, { premultipliedAlpha: false, preserveDrawingBuffer: true });
    var htmlInput = document.getElementById("files");
    var btnInspector = document.getElementById("btnInspector");
    var errorZone = document.getElementById("errorZone");
    var filesInput;
    var currentScene;
    var currentSkybox;
    var currentPluginName;
    var skyboxPath = skyboxes[defaultSkyboxIndex];
    var debugLayerEnabled = false;

    engine.loadingUIBackgroundColor = "#2A2342";

    btnInspector.classList.add("hidden");
    btnEnvironment.classList.add("hidden");

    canvas.addEventListener("contextmenu", function(evt) {
        evt.preventDefault();
    }, false);

    BABYLON.Engine.ShadersRepository = "/src/Shaders/";

    // This is really important to tell Babylon.js to use decomposeLerp and matrix interpolation
    BABYLON.Animation.AllowMatricesInterpolation = true;

    // Setting up some GLTF values
    BABYLON.GLTFFileLoader.IncrementalLoading = false;
    BABYLON.SceneLoader.OnPluginActivatedObservable.add(function(plugin) {
        currentPluginName = plugin.name;
        if (currentPluginName === "gltf") {
            plugin.onValidatedObservable.add(function(results) {
                if (results.issues.numErrors > 0) {
                    debugLayerEnabled = true;
                }
            });
        }
    });

    // Resize
    window.addEventListener("resize", function() {
        engine.resize();
    });

    var anyLoaded = function(babylonScene, playFirstAnimationGroup) {
        // Clear dropdown that contains animation names
        dropdownContent.innerHTML = "";
        animationBar.style.display = "none";
        currentGroup = null;
        babylonScene.skipFrustumClipping = true;

        if (babylonScene.animationGroups.length > 0) {
            animationBar.style.display = "flex";
            for (var index = 0; index < babylonScene.animationGroups.length; index++) {
                var group = babylonScene.animationGroups[index];
                createDropdownLink(group, index);
            }
            currentGroupIndex = playFirstAnimationGroup ? 0 : babylonScene.animationGroups.length - 1;
            currentGroup = babylonScene.animationGroups[currentGroupIndex];
            currentGroup.play(true);
        }

        // Sync the slider with the current frame
        babylonScene.registerBeforeRender(function() {
            if (currentGroup) {
                var targetedAnimations = currentGroup.targetedAnimations;
                if (targetedAnimations.length > 0) {
                    var runtimeAnimations = currentGroup.targetedAnimations[0].animation.runtimeAnimations;
                    if (runtimeAnimations.length > 0) {
                        slider.value = runtimeAnimations[0].currentFrame;
                    }
                }
            }
        });

        // Clear the error
        errorZone.style.display = 'none';
    }

    var assetContainerLoaded = function (sceneFile, babylonScene) {
        anyLoaded(babylonScene);
    }

    var sceneLoaded = function (sceneFile, babylonScene) {
        engine.clearInternalTexturesCache();

        anyLoaded(babylonScene, true);

        // Fix for IE, otherwise it will change the default filter for files selection after first use
        htmlInput.value = "";

        currentScene = babylonScene;

        babylonScene.onAnimationFileImportedObservable.add(function (scene) {
            anyLoaded(scene, false);
        });
        document.title = "Covenantx3d" ;
       // document.title = "Babylon.js - " + sceneFile.name;

        btnInspector.classList.remove("hidden");
        btnEnvironment.classList.remove("hidden");

        // Attach camera to canvas inputs
        if (!currentScene.activeCamera || currentScene.lights.length === 0) {
            currentScene.createDefaultCamera(true);

            if (cameraPosition) {
                currentScene.activeCamera.setPosition(cameraPosition);
            }
            else {
                if (currentPluginName === "gltf") {
                    // glTF assets use a +Z forward convention while the default camera faces +Z. Rotate the camera to look at the front of the asset.
                    currentScene.activeCamera.alpha += Math.PI;
                }

                // Enable camera's behaviors
                currentScene.activeCamera.useFramingBehavior = true;


               
        







                var framingBehavior = currentScene.activeCamera.getBehaviorByName("Framing");
                framingBehavior.framingTime = 0;
                framingBehavior.elevationReturnTime = -1;

                if (currentScene.meshes.length) {
                    currentScene.activeCamera.lowerRadiusLimit = null;

                    var worldExtends = currentScene.getWorldExtends(function (mesh) {
                        return mesh.isVisible && mesh.isEnabled();
                    });
                    framingBehavior.zoomOnBoundingInfo(worldExtends.min, worldExtends.max);
                }
            }

            currentScene.activeCamera.pinchPrecision = 200 / currentScene.activeCamera.radius;
            currentScene.activeCamera.upperRadiusLimit = 5 * currentScene.activeCamera.radius;

            currentScene.activeCamera.wheelDeltaPercentage = 0.01;
            currentScene.activeCamera.pinchDeltaPercentage = 0.01;
        }

        currentScene.activeCamera.attachControl(canvas);

        // Lighting
        if (currentPluginName === "gltf") {
            if (!currentScene.environmentTexture) {
                currentScene.environmentTexture = loadSkyboxPathTexture(skyboxPath, currentScene);
            }

            currentSkybox = currentScene.createDefaultSkybox(currentScene.environmentTexture, true, (currentScene.activeCamera.maxZ - currentScene.activeCamera.minZ) / 2, 0.3, false);
        }
        else {
            var pbrPresent = false;
            for (var i = 0; i < currentScene.materials.length; i++) {
                if (currentScene.materials[i]._transparencyMode !== undefined) {
                    pbrPresent = true;
                    break;
                }
            }

            if (pbrPresent) {
                if (!currentScene.environmentTexture) {
                    currentScene.environmentTexture = loadSkyboxPathTexture(skyboxPath, currentScene);
                }
            }
            else {
                currentScene.createDefaultLight();
            }
        }

        // In case of error during loading, meshes will be empty and clearColor is set to red
        if (currentScene.meshes.length === 0 && currentScene.clearColor.r === 1 && currentScene.clearColor.g === 0 && currentScene.clearColor.b === 0) {
            document.getElementById("logo").className = "";
            canvas.style.opacity = 0;
            debugLayerEnabled = true;
        }
        else {
            if (BABYLON.Tools.errorsCount > 0) {
                debugLayerEnabled = true;
            }
            document.getElementById("logo").className = "hidden";
            document.getElementById("droptext").className = "hidden";
            canvas.style.opacity = 1;
            if (currentScene.activeCamera.keysUp) {
                currentScene.activeCamera.keysUp.push(90); // Z
                currentScene.activeCamera.keysUp.push(87); // W
                currentScene.activeCamera.keysDown.push(83); // S
                currentScene.activeCamera.keysLeft.push(65); // A
                currentScene.activeCamera.keysLeft.push(81); // Q
                currentScene.activeCamera.keysRight.push(69); // E
                currentScene.activeCamera.keysRight.push(68); // D
            }
        }

        if (debugLayerEnabled) {
            currentScene.debugLayer.show();
        }
  
  /*      setTimeout(function(){   document.getElementById("idblac").style.display="none";

     
    },12000);*/
    
    document.getElementById("idblac").style.display="none";
  
    };

    var sceneError = function(sceneFile, babylonScene, message) {
        document.title = "Covenantx3d" ; //sceneFile.name;
        document.getElementById("logo").className = "";
        canvas.style.opacity = 0;

        var errorContent = '<div class="alert alert-error"><button type="button" class="close" data-dismiss="alert">&times;</button>' + message.replace("file:[object File]", "'" + sceneFile.name + "'") + '</div>';

        errorZone.style.display = 'block';
        errorZone.innerHTML ="No se  encontro el archivo 3d intentelo de nuevo se te  llevara al menu"// errorContent giov;

        // Close button error
        errorZone.querySelector('.close').addEventListener('click', function() {
            errorZone.style.display = 'none';
        });
setTimeout(function(){
    window.reload(true);

},1500);
      
    };

    var fgiovanni = function(stv) {


        var rootUrl = BABYLON.Tools.GetFolderPath(stv);
        var fileName = BABYLON.Tools.GetFilename(stv);
        BABYLON.SceneLoader.LoadAsync(rootUrl, fileName, engine).then(function(scene) {
            if (currentScene) {
                currentScene.dispose();
            }

            sceneLoaded({ name: fileName }, scene);

            var godrays1 = new BABYLON.VolumetricLightScatteringPostProcess('godrays1', 1.0, currentScene.activeCamera, null, 100, BABYLON.Texture.BILINEAR_SAMPLINGMODE, engine, false);
        
        	// By default innt usasdfes a billboard to render the sun, just apply the desired texture
        	// position and scale
        	godrays1.mesh.material.diffuseTexture = new BABYLON.Texture('./sun.png', currentScene, true, false, BABYLON.Texture.BILINEAR_SAMPLINGMODE);
        	godrays1.mesh.material.diffuseTexture.hasAlpha = true;
        	godrays1.mesh.position = new BABYLON.Vector3(-150, 150, 150);
        	godrays1.mesh.scaling = new BABYLON.Vector3(350, 350, 350);
          
            var gl = new BABYLON.GlowLayer("glow", scene, { mainTextureSamples: 2 });
        	//light.position = godrays1.mesh.position;
            var hdrTexture = new BABYLON.CubeTexture("./SpecularHDR.dds", scene);
            currentScene.createDefaultSkybox(hdrTexture, true, 500);

            scene.whenReadyAsync().then(function() {
                engine.runRenderLoop(function() {
                    scene.render();
                });
            });
            
            escribeenidpinfot(objetoinfo3d.artista,objetoinfo3d.email,objetoinfo3d.precio);



            

        }).catch(function(reason) {
            sceneError({ name: fileName }, null, reason.message || reason);
        });
    };


    setTimeout(function(){ 
        
        //fgiovannifgiovanni ("http://download1710.mediafire.com/5gp1m1jkh7bg/ket7lqcdxb0rtkg/sceneg.glb");

    setTimeout(function(){ 
      
    
        
       /* BABYLON.GLTF2Export.GLBAsync(currentScene, "fileName", ).then((glb) => {
            glb.downloadFiles();
        });
*/

     }, 4000);

}, 4000);
    

    var loadFromAssetUrl = function() {
        var rootUrl = BABYLON.Tools.GetFolderPath(assetUrl);
        var fileName = BABYLON.Tools.GetFilename(assetUrl);
        BABYLON.SceneLoader.LoadAsync(rootUrl, fileName, engine).then(function(scene) {
            if (currentScene) {
                currentScene.dispose();
            }

            sceneLoaded({ name: fileName }, scene);

            scene.whenReadyAsync().then(function() {
                engine.runRenderLoop(function() {
                    scene.render();
                });
            });
        }).catch(function(reason) {
            sceneError({ name: fileName }, null, reason.message || reason);
        });
    };

    if (assetUrl) {
        loadFromAssetUrl();
    }
    else {
        var startProcessingFiles = function() {
            BABYLON.Tools.ClearLogCache();
        };

        filesInput = new BABYLON.FilesInput(engine, null, sceneLoaded, null, null, null, startProcessingFiles, null, sceneError);
        filesInput.onProcessFileCallback = (function(file, name, extension) {
            if (filesInput._filesToLoad && filesInput._filesToLoad.length === 1 && extension) {
                if (extension.toLowerCase() === "dds" ||
                    extension.toLowerCase() === "env" ||
                    extension.toLowerCase() === "hdr") {
                    BABYLON.FilesInput.FilesToLoad[name] = file;

                    
                    skyboxPath = "file:" + file.correctName;
                    return false;
                }
            }
            return true;
        }).bind(this);
        filesInput.monitorElementForDragNDrop(canvas);

        htmlInput.addEventListener('change', function(event) {
           // console.log(event);
            // Handling data transfer via drag'n'drop
            if (event && event.dataTransfer && event.dataTransfer.files) {
                filesToLoad = event.dataTransfer.files;
            
            }
            // Handling files from input files
            if (event && event.target && event.target.files) {
                filesToLoad = event.target.files;
            }
            console.log(111111);
            filesInput.loadFiles(event);
        }, false);
    }

    window.addEventListener("keydown", function(event) {
        // Press R to reload
        if (event.keyCode === 82 && event.target.nodeName !== "INPUT" && currentScene) {
            if (assetUrl) {
                loadFromAssetUrl();
            }
            else {
                filesInput.reload();
            }
        }
    });

    btnInspector.addEventListener('click', function() {
        if (currentScene) {
            if (currentScene.debugLayer.isVisible()) {
                debugLayerEnabled = false;
                currentScene.debugLayer.hide();
            }
            else {
                currentScene.debugLayer.show();
                debugLayerEnabled = true;
            }
        }
    }, false);

    window.addEventListener("keydown", function(event) {
        // Press space to toggle footer
        if (event.keyCode === 32 && event.target.nodeName !== "INPUT") {
            if (footer.style.display === "none") {
                footer.style.display = "block";
                canvasZone.style.height = "calc(100% - 56px)";
                if (debugLayerEnabled) {
                    currentScene.debugLayer.show();
                }
                engine.resize();
            }
            else {
                footer.style.display = "none";
                canvasZone.style.height = "100%";
                errorZone.style.display = "none";
                engine.resize();
                if (currentScene.debugLayer.isVisible()) {
                    currentScene.debugLayer.hide();
                }
            }
        }
    });

    sizeScene();

    window.onresize = function() {
        sizeScene();
    }
}

function sizeScene() {
    let divInspWrapper = document.getElementsByClassName('insp-wrapper')[0];
    if (divInspWrapper) {
        let divFooter = document.getElementsByClassName('footer')[0];
        divInspWrapper.style.height = (document.body.clientHeight - divFooter.clientHeight) + "px";
        divInspWrapper.style['max-width'] = document.body.clientWidth + "px";
    }
}




























var stelementos="";


function playAudimenuo() {
  xma.play();
}
var   xma;
function pauseAudiomenu() {
  xma.pause();
}



$(document).ready(function(){

    llamatodo();


});


var arrprimerjs=[];

function llamatodo(){

    $.getJSON("jsonstore.json", function(result){
   
        arrprimerjs=result;


  });

}



var nolsiencotre=false;
var stadondevoy="";
var idx=0;
function anadirobj(xa,xb){
    stelementos="";
    stelementos ='<div id="'+xa+'"  class="clcaja"><div class="clcajamenor"><img  class="imgclas" src="'+xb+'" alt=""><span class="clbtnombre">'+xa+'</span></div></div>';
    $("#idparteabajo").append( stelementos);
    $("#"+String(xa)).click(function(){
     clickalelemento(this);
       
});
}
function elimarelemtos(){

    $("#idparteabajo").empty();
}


var objetoinfo3d;
function clickalelemento(thiss) { 

for(var i in arrprimerjs){
    if(arrprimerjs[i].id==thiss.id){
        objetoinfo3d=arrprimerjs[i];
nolsiencotre=true;
stadondevoy=arrprimerjs[i].fileurl;
      break;
    }
}
if(nolsiencotre){
//window.location=stadondevoy;https://unonubesdiez.github.io/oniva15/avf15.glb
detenerscene2();
elimarelemtos();
document.getElementById("idpaneluno").style.display="none";


document.getElementById("idpanelrendethreejsincio").style.display="none";
document.getElementById("idivimgabrripago").style.display="block";

fgiovanni (stadondevoy);
 nolsiencotre=false;
        
    }
 }




 function fvovelyaamenu() { 
    /*
    if (currentScene) {
      currentScene.dispose();
   engine. stopRenderLoop();
    }



    document.getElementById("idpanelrendethreejsincio").style.display="block";

   document.getElementById("idivimgabrripago").style.display="none";

   
   volveracrear();
*/
location.reload();
  }



var tocapara=true;

function  mostrarobjyos() { 

    if(tocapara){
        tocapara=!tocapara;

   document.getElementById("idpaneluno").style.display="flex";
   elimarelemtos();
    for(var i in arrprimerjs){
        anadirobj(arrprimerjs[i].id,arrprimerjs[i].img);
      //  console.log(arrprimerjs[i].namearchivo);
      //  console.log(arrprimerjs[i].url);
    }
    
    }
 else{
    elimarelemtos();
    tocapara=!tocapara;
    document.getElementById("idpaneluno").style.display="none";
  
 }



 }

function escribeenidpinfot(nm,em,prx){
document.getElementById("idpartistainfo").innerHTML="Artista Digital:  "+nm+" <br> "+"email; "+em+" <br>  "+"precio: "+"$"+prx+""

    
}







function onmasuimg (){
    xma = document.getElementById("idaudio");
    playAudimenuo();

}




function fcerrarpay(){

    document.getElementById("iddivpanelpay").style.display="none";
}

var sipagaonopay=true;
function fopenpay(){
if(sipagaonopay){
    document.getElementById("iddivpanelpay").style.display="none";
    sipagaonopay=!sipagaonopay;
}
else{
    sipagaonopay=!sipagaonopay;
    document.getElementById("iddivpanelpay").style.display="flex";
}
    

}

