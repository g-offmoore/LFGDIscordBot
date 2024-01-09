const pb = {
    
  /*le: '<:le:1193193506911555635>',
  lf: '<:lf:1193193508266315808>', 
  me: '<:me:1193193509541380117>', 
  mf: '<:mf:1193193510745149560>', 
  re: '<:re:1193193511810498601>', 
  rf: '<:rf:1193193514138357942>',*/
  
  
    le: '<:le:1193193198932213770>',
    me: '<:me:1193193202346360893>',
    re: '<:re:1193193204128956487> ',
    lf: '<:lf:1193193201448796190> ',
    mf: '<:mf:1193193203218784288> ',
    rf: '<:rf:1193193205697630259>',
  };
   
  function formatResults(upvotes = [], downvotes = []) {
    const totalVotes = upvotes.length + downvotes.length;
    const progressBarLength = 14;
    const filledSquares = Math.round((upvotes.length / totalVotes) * progressBarLength) || 0;
    const emptySquares = progressBarLength - filledSquares || 0;
   
    if (!filledSquares && !emptySquares) {
      emptySquares = progressBarLength;
    }
   
    const upPercentage = (upvotes.length / totalVotes) * 100 || 0;
    const downPercentage = (downvotes.length / totalVotes) * 100 || 0;
   
    const progressBar =
      (filledSquares ? pb.lf : pb.le) +
      (pb.mf.repeat(filledSquares) + pb.me.repeat(emptySquares)) +
      (filledSquares === progressBarLength ? pb.rf : pb.re);
   
    const results = [];
    results.push(
      `👍 ${upvotes.length} upvotes (${upPercentage.toFixed(1)}%) • 👎 ${
        downvotes.length
      } downvotes (${downPercentage.toFixed(1)}%)`
    );
    results.push(progressBar);
   
    return results.join('\n');
  }
   
  module.exports = formatResults;