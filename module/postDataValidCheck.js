module.exports = (postData) => {
    try{
        const title = postData.title || '';
        const description = postData.description || '';
        const categoryIdx = postData.categoryIdx || -1;
        const postType = postData.postType || 1;
        const hashtag = postData.hashtag || [];
        const vote = postData.vote || [];
        const link = postData.link || [];

        //title check
        if(title.length === 0 || title.length > 32){
            return {
                state : false,
                message : 'invalid title'
            }
        }

        //description check
        if(description.length > 1024){
            return {
                state : false,
                messgae : 'invalid description'
            }
        }

        if(isNaN(parseInt(categoryIdx))){
            return {
                state : false,
                message : 'type of category idx must be int'
            }
        }

        //postType check
        if(!(postType == 1 || postType == 2 || postType == 3)){
            return {
                state : false,
                message : 'invalid post type'
            }
        }

        //hashtag type check
        if(!Array.isArray(hashtag)){
            return {
                state : false,
                message : 'type of hashtag must be array'
            }
        }

        //hashtag length check
        if(hashtag.length > 5){
            return {
                state : false,
                message : 'number of hashtags exceeded'
            }
        }
        
        //hashtag contents check
        for (let i = 0; i < hashtag.length; i++) {
            const hashtagData = hashtag[i];
            if(hashtagData.length > 16 || hashtagData.length < 1){
                return {
                    state : false,
                    message : `length of hashtag : ${hashtagData} exceeded`
                }
            }
        }

        //vote check
        if(postType == 2){
            if(!Array.isArray(vote)){
                return {
                    state : false,
                    message : 'type of vote must be array'
                }
            }

            if(vote.length < 1){
                return {
                    state : false,
                    message : 'vote is required'
                }
            }

            if(vote.length > 8){
                return {
                    state : false,
                    message : 'number of vote exceeded'
                }
            }

            for (let i = 0; i < vote.length; i++) {
                const voteData = vote[i];
                if(!voteData.contents){
                    return {
                        state : false,
                        message : 'vote contents is required'
                    }
                }

                if(voteData.contents.length > 32 || voteData.contents.length < 1){
                    return {
                        state : false,
                        message : `invalid vote contents : ${voteData.contents}}`
                    }
                }
            }
        }

        //link check
        if(postType == 3){
            if(!Array.isArray(link)){
                return {
                    state : false,
                    message : 'type of link must be array'
                }
            }

            if(link.length < 1){
                return {
                    state : false,
                    message : 'link is require'
                }
            }

            if(link.length > 5){
                return {
                    state : false,
                    message : 'number of link exceeded'
                }
            }

            for (let i = 0; i < link.length; i++) {
                const linkData = link[i];   

                if(!linkData.name){
                    return {
                        state : false,
                        message : 'link name is required'
                    }
                }

                if(!linkData.url){
                    return {
                        state : false,
                        message : 'link url is required'
                    }
                }
                
                if(linkData.name < 1 || linkData.name > 12){
                    return{
                        state : false,
                        message : `invalid link name : ${linkData.name}`
                    }
                }

                if(linkData.url < 1 || linkData.url > 1024){
                    return {
                        state : false,
                        message : `invalid link url : ${linkData.name} / ${linkData.url}`
                    }
                }
            }
        }

        return {
            state : true
        }
    }catch(err){
        console.log(err);

        return {
            state : false,
            message : 'post data is invalid'
        }
    }
}