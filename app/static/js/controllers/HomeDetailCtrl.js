function HomeDetailCtrl($scope, Restangular, flash) {
    // $scope.posts = Restangular.all('datasets').getList().$object;

    $scope.test = function() {

        // Publish a success flash
        flash.success = 'Do it live!';
    }
}

   /*
    console.log(Post.get());
    Post.getAll().then(function(bla){
        console.log(bla);
        console.log("posts");
    })

    Restangular.all('posts').getList().then(function(ha){
        console.log(ha);
    });

    $scope.add = function() {
        resource.post($scope.newVegetable).then(function(newResource){
                $scope.vegetables.push(newResource);
        })
    }
    */
