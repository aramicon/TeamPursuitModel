function(x){
     	let score = 0;
        for(let i = 0; i< x.length; i++){
               score += (x[i]=="1"?1:0);
        }
       return score;
} 
