var arrayjsonurlscrip=[];
 var directorioraizdescripturl="./"


$(document).ready(function(){
   
    
    traerdatosurl();


  });






//http://127.0.0.1:5501/index.html


  async function traerdatosurl(){












    arrayjsonurlscrip=[];
 var arrayjson=   await fetch("jsonstoreurl.json");
 arrayjson= await arrayjson.json();

for(var i in arrayjson){
    arrayjsonurlscrip.push(arrayjson[i]);
console.log(arrayjson[i]);
}

crearloscripst();


  }


  function creaoeltodo(){




    var stcrear="";





    $("p").append(stcrear);
  }

var arraybloburl=[];
async function crearloscripst(){

for(var i in arrayjsonurlscrip){

    var vienebloburl=await fetch(directorioraizdescripturl+arrayjsonurlscrip[i]);
    vienebloburl=await vienebloburl.blob();
    
    console.log("URL.createObjectURL(vienebloburl)");
    console.log(URL.createObjectURL(vienebloburl));
    var stscriprapido=' <script src="'+URL.createObjectURL(vienebloburl)+'"></script>';
    
    $("head").append(stscriprapido);
    console.log("creo");
    

}







}




async function  secuenciadd() {  


  /*   for(){
await

    } */
}