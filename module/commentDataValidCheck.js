module.exports = (commentContents = '') => {
    if(commentContents.length < 1 || commentContents.length > 512){
        return false;
    }
    return true;
}