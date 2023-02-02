module.exports = (searchKeyword) => {
    if(searchKeyword.length === 0 || searchKeyword.length > 32){
        return false;
    }
    return true;
}