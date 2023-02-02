module.exports = (categoryName = '') => {
    if(categoryName.length > 1 && categoryName.length < 9){
        return true;
    }
    return false;
}