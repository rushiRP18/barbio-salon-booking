function showAlert() {
    Swal.fire({
        title: "Confirm?",
        text: "Do you want to confirm this appointment?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "No"
    }).then((result) => {
        if (result.isConfirmed) {
            document.getElementById("confirmForm").submit();
        }
    });
}
function addShop() {
    Swal.fire({
        title: "Confirm?",
        text: "Do you want to create new shop?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "No"
    }).then((result) => {
        if (result.isConfirmed) {
            document.getElementById("addShopForm").submit();
        }
    });
}
function editShop() {
    Swal.fire({
        title: "Do you want to save the changes?",
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: "Save",
        denyButtonText: `Don't save`
    }).then((result) => {
        if (result.isConfirmed) {
            document.getElementById("addShopForm").submit();
            Swal.fire("Saved!", "", "success");

        } else if (result.isDenied) {
            Swal.fire("Changes are not saved", "", "info");
        }
    });
    
}

function delShop() {
    Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, delete it!"
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: "Deleted!",
                text: "Your file has been deleted.",
                icon: "success"
            });
            document.getElementById("addShopForm").submit();
            
        }
    });
}


module.exports = {
    showAlert,
    addShop,
    editShop,
    delShop
};