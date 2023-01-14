module.exports = (channelData) => {
    const { email, pw, pwCheck, birth, sex, channelName } = channelData;
    
    //email valid check
    const emailExp = new RegExp('^[a-zA-Z0-9+-\_.]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$');   
    if(!emailExp.test(email)) return { state : false, message : "invalid email"};

    //pw valid check
    const pwExp = new RegExp('^(?=.*[A-Za-z])(?=.*\d)(?=.*[$@$!%*#?&])[A-Za-z\d$@$!%*#?&]{8,16}$');
    if(!pwExp.test(pw)) return { state : false, message : "invalid password"};

    //pwCheck valid check
    if(pw !== pwCheck) return { state : false, message : "invalid password check"};

    //birth valid check
    const birthExp = new RegExp('^(19[0-9][0-9]|20\d{2})-(0[0-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$');
    if(!birthExp.test(birth)) return { state : false, message : "invalid birth"};

    //sex valid check
    if(sex !== 1 && sex !== 2) return { state : false, message : "invalid sex code"};

    //chennal name valid check
    const channelNameExp = new RegExp('^(?=.*[a-z0-9가-힣])[a-z0-9가-힣]{2,32}$');
    if(!channelNameExp.test(channelName)) return { state : false, message : "invalid channel name"};

    //all skip
    return { state : true };
}